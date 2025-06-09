#import "LHMessagePeerConnection.h"
#import <React/RCTLog.h>
#import <MultipeerConnectivity/MultipeerConnectivity.h>
#import <UIKit/UIKit.h>

// Message type constants
static NSString *const kMessageTypeText = @"text";
static NSString *const kMessageTypeImage = @"image";

// Image constants
static const CGFloat kMaxImageSize = 5.0 * 1024 * 1024; // 5MB
static const CGFloat kImageCompressionQuality = 0.7; // 70% quality

@interface LHMessagePeerConnection () <MCSessionDelegate, MCNearbyServiceAdvertiserDelegate, MCNearbyServiceBrowserDelegate>

@property (nonatomic, strong) MCPeerID *peerId;
@property (nonatomic, strong) MCSession *session;
@property (nonatomic, strong) MCNearbyServiceAdvertiser *advertiser;
@property (nonatomic, strong) MCNearbyServiceBrowser *browser;
@property (nonatomic, strong) NSMutableArray *connectedPeers;
@property (nonatomic, strong) NSMutableArray *peerFoundCallbacks;
@property (nonatomic, strong) NSMutableArray *peerLostCallbacks;
@property (nonatomic, strong) NSMutableArray *messageCallbacks;
@property (nonatomic, strong) NSMutableArray *connectionStateCallbacks;

@end

@implementation LHMessagePeerConnection

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
    RCTLogInfo(@"LHMessagePeerConnection: Initializing");
    self = [super init];
    if (self) {
        @try {
            _connectedPeers = [NSMutableArray array];
            _peerFoundCallbacks = [NSMutableArray array];
            _peerLostCallbacks = [NSMutableArray array];
            _messageCallbacks = [NSMutableArray array];
            _connectionStateCallbacks = [NSMutableArray array];
            RCTLogInfo(@"LHMessagePeerConnection: Initialization successful");
        } @catch (NSException *exception) {
            RCTLogError(@"LHMessagePeerConnection: Initialization failed - %@", exception);
        }
    }
    return self;
}

- (void)dealloc {
    RCTLogInfo(@"LHMessagePeerConnection: Deallocating");
    [self cleanup];
}

- (void)cleanup {
    @try {
        [self.advertiser stopAdvertisingPeer];
        [self.browser stopBrowsingForPeers];
        [self.session disconnect];
        
        self.advertiser = nil;
        self.browser = nil;
        self.session = nil;
        self.peerId = nil;
        
        [self.connectedPeers removeAllObjects];
        [self.peerFoundCallbacks removeAllObjects];
        [self.peerLostCallbacks removeAllObjects];
        [self.messageCallbacks removeAllObjects];
        [self.connectionStateCallbacks removeAllObjects];
        
        RCTLogInfo(@"LHMessagePeerConnection: Cleanup completed");
    } @catch (NSException *exception) {
        RCTLogError(@"LHMessagePeerConnection: Cleanup failed - %@", exception);
    }
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"peerFound", @"peerLost", @"messageReceived", @"connectionStateChanged"];
}

- (void)startObserving {
  // No-op for now
}

- (void)stopObserving {
  // No-op for now
}

RCT_EXPORT_METHOD(startAdvertising:(NSString *)roomName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    @try {
      if (!self.peerId) {
        self.peerId = [[MCPeerID alloc] initWithDisplayName:[[UIDevice currentDevice] name]];
      }
      
      if (!self.session) {
        self.session = [[MCSession alloc] initWithPeer:self.peerId securityIdentity:nil encryptionPreference:MCEncryptionRequired];
        self.session.delegate = self;
      }
      
      if (self.advertiser) {
        [self.advertiser stopAdvertisingPeer];
        self.advertiser = nil;
      }

      self.advertiser = [[MCNearbyServiceAdvertiser alloc] initWithPeer:self.peerId discoveryInfo:nil serviceType:roomName];
      self.advertiser.delegate = self;

      [self.advertiser startAdvertisingPeer];
      resolve(@YES);
    } @catch (NSException *exception) {
      reject(@"error", exception.reason, nil);
    }
  });
}

RCT_EXPORT_METHOD(startBrowsing:(NSString *)roomName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    @try {
      if (!self.peerId) {
        self.peerId = [[MCPeerID alloc] initWithDisplayName:[[UIDevice currentDevice] name]];
      }
      
      if (!self.session) {
        self.session = [[MCSession alloc] initWithPeer:self.peerId securityIdentity:nil encryptionPreference:MCEncryptionRequired];
        self.session.delegate = self;
      }
      
      if (self.browser) {
        [self.browser stopBrowsingForPeers];
        self.browser = nil;
      }

      self.browser = [[MCNearbyServiceBrowser alloc] initWithPeer:self.peerId serviceType:roomName];
      self.browser.delegate = self;

      [self.browser startBrowsingForPeers];
      resolve(@YES);
    } @catch (NSException *exception) {
      reject(@"error", exception.reason, nil);
    }
  });
}

RCT_EXPORT_METHOD(sendImage:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            if (!self.session || self.connectedPeers.count == 0) {
                reject(@"error", @"Session not initialized or no connected peers", nil);
                return;
            }

            // Decode base64 image
            NSData *imageData = [[NSData alloc] initWithBase64EncodedString:base64Image options:NSDataBase64DecodingIgnoreUnknownCharacters];
            if (!imageData) {
                reject(@"error", @"Invalid base64 image data", nil);
                return;
            }

            // Convert to UIImage
            UIImage *image = [UIImage imageWithData:imageData];
            if (!image) {
                reject(@"error", @"Could not create image from data", nil);
                return;
            }

            // Compress image
            NSData *compressedData = UIImageJPEGRepresentation(image, kImageCompressionQuality);
            if (!compressedData) {
                reject(@"error", @"Failed to compress image", nil);
                return;
            }

            // Check size
            if (compressedData.length > kMaxImageSize) {
                reject(@"error", @"Image size exceeds 5MB limit after compression", nil);
                return;
            }

            // Create message dictionary
            NSDictionary *messageDict = @{
                @"type": kMessageTypeImage,
                @"content": [compressedData base64EncodedStringWithOptions:0],
                @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
            };

            // Convert to JSON
            NSError *jsonError;
            NSData *messageData = [NSJSONSerialization dataWithJSONObject:messageDict options:0 error:&jsonError];
            if (jsonError) {
                reject(@"error", @"Failed to create message JSON", jsonError);
                return;
            }

            // Send data
            NSError *sendError;
            [self.session sendData:messageData toPeers:self.connectedPeers withMode:MCSessionSendDataReliable error:&sendError];

            if (sendError) {
                reject(@"error", sendError.localizedDescription, sendError);
            } else {
                resolve(@YES);
            }
        } @catch (NSException *exception) {
            reject(@"error", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(sendMessage:(NSString *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            if (!self.session || self.connectedPeers.count == 0) {
                reject(@"error", @"Session not initialized or no connected peers", nil);
                return;
            }

            // Create message dictionary
            NSDictionary *messageDict = @{
                @"type": kMessageTypeText,
                @"content": message,
                @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
            };

            // Convert to JSON
            NSError *jsonError;
            NSData *messageData = [NSJSONSerialization dataWithJSONObject:messageDict options:0 error:&jsonError];
            if (jsonError) {
                reject(@"error", @"Failed to create message JSON", jsonError);
                return;
            }

            // Send data
            NSError *sendError;
            [self.session sendData:messageData toPeers:self.connectedPeers withMode:MCSessionSendDataReliable error:&sendError];

            if (sendError) {
                reject(@"error", sendError.localizedDescription, sendError);
            } else {
                resolve(@YES);
            }
        } @catch (NSException *exception) {
            reject(@"error", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(addPeerFoundListener:(RCTResponseSenderBlock)callback) {
  [self.peerFoundCallbacks addObject:callback];
}

RCT_EXPORT_METHOD(addPeerLostListener:(RCTResponseSenderBlock)callback) {
  [self.peerLostCallbacks addObject:callback];
}

RCT_EXPORT_METHOD(addMessageReceivedListener:(RCTResponseSenderBlock)callback) {
  [self.messageCallbacks addObject:callback];
}

RCT_EXPORT_METHOD(addConnectionStateChangedListener:(RCTResponseSenderBlock)callback) {
  [self.connectionStateCallbacks addObject:callback];
}

RCT_EXPORT_METHOD(removeListeners:(double)count) {
    // This method is required by RCTEventEmitter
    // It's called when the last listener is removed
    RCTLogInfo(@"LHMessagePeerConnection: Removing %f listeners", count);
    [self cleanup];
}

#pragma mark - MCSessionDelegate

- (void)session:(MCSession *)session peer:(MCPeerID *)peerID didChangeState:(MCSessionState)state {
  dispatch_async(dispatch_get_main_queue(), ^{
    switch (state) {
      case MCSessionStateConnected:
        [self.connectedPeers addObject:peerID];
        [self notifyConnectionStateChanged:peerID state:ConnectionStateConnected];
        break;
      case MCSessionStateNotConnected:
        [self.connectedPeers removeObject:peerID];
        [self notifyConnectionStateChanged:peerID state:ConnectionStateNotConnected];
        break;
      default:
        break;
    }
  });
}

- (void)session:(MCSession *)session didReceiveData:(NSData *)data fromPeer:(MCPeerID *)peerID {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            // Parse message JSON
            NSError *jsonError;
            NSDictionary *messageDict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
            if (jsonError) {
                RCTLogError(@"Failed to parse message JSON: %@", jsonError);
                return;
            }

            // Create event dictionary
            NSMutableDictionary *eventDict = [NSMutableDictionary dictionary];
            [eventDict addEntriesFromDictionary:messageDict];
            [eventDict setObject:peerID.displayName forKey:@"peerId"];

            // Send event
            [self sendEventWithName:@"messageReceived" body:eventDict];
        } @catch (NSException *exception) {
            RCTLogError(@"Error processing received message: %@", exception);
        }
    });
}

- (void)session:(MCSession *)session didReceiveStream:(NSInputStream *)stream withName:(NSString *)streamName fromPeer:(MCPeerID *)peerID {
  // Not implemented
}

- (void)session:(MCSession *)session didStartReceivingResourceWithName:(NSString *)resourceName fromPeer:(MCPeerID *)peerID withProgress:(NSProgress *)progress {
  // Not implemented
}

- (void)session:(MCSession *)session didFinishReceivingResourceWithName:(NSString *)resourceName fromPeer:(MCPeerID *)peerID atURL:(NSURL *)localURL withError:(NSError *)error {
  // Not implemented
}

#pragma mark - MCNearbyServiceAdvertiserDelegate

- (void)advertiser:(MCNearbyServiceAdvertiser *)advertiser didReceiveInvitationFromPeer:(MCPeerID *)peerID withContext:(NSData *)context invitationHandler:(void (^)(BOOL, MCSession *))invitationHandler {
  invitationHandler(YES, self.session);
}

#pragma mark - MCNearbyServiceBrowserDelegate

- (void)browser:(MCNearbyServiceBrowser *)browser foundPeer:(MCPeerID *)peerID withDiscoveryInfo:(NSDictionary<NSString *,NSString *> *)info {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self notifyPeerFound:peerID];
    [browser invitePeer:peerID toSession:self.session withContext:nil timeout:30];
  });
}

- (void)browser:(MCNearbyServiceBrowser *)browser lostPeer:(MCPeerID *)peerID {
  dispatch_async(dispatch_get_main_queue(), ^{
    [self notifyPeerLost:peerID];
  });
}

// Notification methods
- (void)notifyPeerFound:(MCPeerID *)peerID {
    for (RCTResponseSenderBlock callback in self.peerFoundCallbacks) {
        callback(@[@{@"peerId": peerID.displayName}]);
    }
}

- (void)notifyPeerLost:(MCPeerID *)peerID {
    for (RCTResponseSenderBlock callback in self.peerLostCallbacks) {
        callback(@[@{@"peerId": peerID.displayName}]);
    }
}

- (void)notifyMessageReceived:(MCPeerID *)peerID message:(NSString *)message {
    for (RCTResponseSenderBlock callback in self.messageCallbacks) {
        callback(@[@{@"peerId": peerID.displayName, @"message": message}]);
    }
}

- (void)notifyConnectionStateChanged:(MCPeerID *)peerID state:(ConnectionState)state {
    NSString *stateString;
    switch (state) {
        case ConnectionStateConnected:
            stateString = @"connected";
            break;
        case ConnectionStateNotConnected:
            stateString = @"notConnected";
            break;
    }
    
    for (RCTResponseSenderBlock callback in self.connectionStateCallbacks) {
        callback(@[@{@"peerId": peerID.displayName, @"state": stateString}]);
    }
}

@end 
