package com.lhmessage;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

public class LHMessagePeerConnectionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "LHMessagePeerConnection";
    private final ReactApplicationContext reactContext;
    private final ConnectionsClient connectionsClient;
    private String localEndpointName;

    public LHMessagePeerConnectionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.connectionsClient = Nearby.getConnectionsClient(reactContext);
        this.localEndpointName = android.os.Build.MODEL;
    }

    @Override
    public String getName() {
        return "LHMessagePeerConnection";
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @ReactMethod
    public void startAdvertising(String serviceType) {
        AdvertisingOptions advertisingOptions = new AdvertisingOptions.Builder()
            .setStrategy(Strategy.P2P_STAR)
            .build();

        connectionsClient.startAdvertising(
            localEndpointName,
            serviceType,
            connectionLifecycleCallback,
            advertisingOptions
        );
    }

    @ReactMethod
    public void startBrowsing(String serviceType) {
        DiscoveryOptions discoveryOptions = new DiscoveryOptions.Builder()
            .setStrategy(Strategy.P2P_STAR)
            .build();

        connectionsClient.startDiscovery(
            serviceType,
            endpointDiscoveryCallback,
            discoveryOptions
        );
    }

    @ReactMethod
    public void sendMessage(String message) {
        Payload payload = Payload.fromBytes(message.getBytes());
        connectionsClient.sendPayload(connectionsClient.getConnectedEndpoints(), payload);
    }

    private final ConnectionLifecycleCallback connectionLifecycleCallback = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(String endpointId, ConnectionInfo connectionInfo) {
            connectionsClient.acceptConnection(endpointId, payloadCallback);
        }

        @Override
        public void onConnectionResult(String endpointId, ConnectionResolution resolution) {
            WritableMap params = Arguments.createMap();
            params.putString("peerId", endpointId);
            
            switch (resolution.getStatus().getStatusCode()) {
                case ConnectionsStatusCodes.STATUS_OK:
                    params.putInt("state", 2); // Connected
                    break;
                case ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED:
                    params.putInt("state", 0); // Not Connected
                    break;
                case ConnectionsStatusCodes.STATUS_ERROR:
                    params.putInt("state", 0); // Not Connected
                    break;
                default:
                    params.putInt("state", 1); // Connecting
            }
            
            sendEvent("connectionStateChanged", params);
        }

        @Override
        public void onDisconnected(String endpointId) {
            WritableMap params = Arguments.createMap();
            params.putString("peerId", endpointId);
            params.putInt("state", 0); // Not Connected
            sendEvent("connectionStateChanged", params);
        }
    };

    private final EndpointDiscoveryCallback endpointDiscoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(String endpointId, DiscoveredEndpointInfo discoveredEndpointInfo) {
            WritableMap params = Arguments.createMap();
            params.putString("peerId", endpointId);
            sendEvent("peerFound", params);
            
            connectionsClient.requestConnection(
                localEndpointName,
                endpointId,
                connectionLifecycleCallback
            );
        }

        @Override
        public void onEndpointLost(String endpointId) {
            WritableMap params = Arguments.createMap();
            params.putString("peerId", endpointId);
            sendEvent("peerLost", params);
        }
    };

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(String endpointId, Payload payload) {
            if (payload.getType() == Payload.Type.BYTES) {
                String message = new String(payload.asBytes());
                WritableMap params = Arguments.createMap();
                params.putString("peerId", endpointId);
                params.putString("message", message);
                sendEvent("messageReceived", params);
            }
        }

        @Override
        public void onPayloadTransferUpdate(String endpointId, PayloadTransferUpdate update) {
            // Handle transfer updates if needed
        }
    };
} 