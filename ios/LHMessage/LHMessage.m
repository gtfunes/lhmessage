#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(LHMessagePeerConnection, RCTEventEmitter)

RCT_EXTERN_METHOD(startAdvertising:(NSString *)serviceType)
RCT_EXTERN_METHOD(startBrowsing:(NSString *)serviceType)
RCT_EXTERN_METHOD(sendMessage:(NSString *)message)

@end 
