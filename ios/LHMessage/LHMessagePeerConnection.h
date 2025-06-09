#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <MultipeerConnectivity/MultipeerConnectivity.h>

typedef NS_ENUM(NSInteger, ConnectionState) {
    ConnectionStateConnected,
    ConnectionStateNotConnected
};

@interface LHMessagePeerConnection : RCTEventEmitter <RCTBridgeModule>

// Public methods
- (void)startAdvertising:(NSString *)roomName resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)startBrowsing:(NSString *)roomName resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)sendMessage:(NSString *)message resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)sendImage:(NSString *)base64Image resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// Internal notification methods
- (void)notifyPeerFound:(MCPeerID *)peerID;
- (void)notifyPeerLost:(MCPeerID *)peerID;
- (void)notifyMessageReceived:(MCPeerID *)peerID message:(NSString *)message;
- (void)notifyConnectionStateChanged:(MCPeerID *)peerID state:(ConnectionState)state;

@end 