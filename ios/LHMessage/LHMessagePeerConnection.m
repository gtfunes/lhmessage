#import "LHMessagePeerConnection.h"
#import <React/RCTLog.h>
#import <MultipeerConnectivity/MultipeerConnectivity.h>

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
      
      if (!self.advertiser) {
        self.advertiser = [[MCNearbyServiceAdvertiser alloc] initWithPeer:self.peerId discoveryInfo:nil serviceType:roomName];
        self.advertiser.delegate = self;
      }

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
      
      if (!self.browser) {
        self.browser = [[MCNearbyServiceBrowser alloc] initWithPeer:self.peerId serviceType:roomName];
        self.browser.delegate = self;
      }

      [self.browser startBrowsingForPeers];
      resolve(@YES);
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

      NSData *messageData = [message dataUsingEncoding:NSUTF8StringEncoding];
      NSError *error;
      [self.session sendData:messageData toPeers:self.connectedPeers withMode:MCSessionSendDataReliable error:&error];

      if (error) {
        reject(@"error", error.localizedDescription, error);
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
    NSString *message = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (message) {
      [self notifyMessageReceived:peerID message:message];
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