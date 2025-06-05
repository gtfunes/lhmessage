#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <MultipeerConnectivity/MultipeerConnectivity.h>

typedef NS_ENUM(NSInteger, ConnectionState) {
    ConnectionStateConnected,
    ConnectionStateNotConnected
};

@interface LHMessagePeerConnection : RCTEventEmitter <RCTBridgeModule>

- (void)notifyPeerFound:(MCPeerID *)peerID;
- (void)notifyPeerLost:(MCPeerID *)peerID;
- (void)notifyMessageReceived:(MCPeerID *)peerID message:(NSString *)message;
- (void)notifyConnectionStateChanged:(MCPeerID *)peerID state:(ConnectionState)state;

@end 