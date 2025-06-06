package com.lhmessage;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
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

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.HashSet;
import java.util.Set;

public class LHMessagePeerConnectionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "LHMessagePeerConnection";
    private final ReactApplicationContext reactContext;
    private final ConnectionsClient connectionsClient;
    private String localEndpointName;
    private final Set<String> connectedEndpoints = new HashSet<>();

    // Message type constants
    private static final String MESSAGE_TYPE_TEXT = "text";
    private static final String MESSAGE_TYPE_IMAGE = "image";

    // Image constants
    private static final int MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final int IMAGE_COMPRESSION_QUALITY = 70; // 70% quality

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
        try {
            JSONObject messageJson = new JSONObject();
            messageJson.put("type", MESSAGE_TYPE_TEXT);
            messageJson.put("content", message);
            messageJson.put("timestamp", System.currentTimeMillis());

            Payload payload = Payload.fromBytes(messageJson.toString().getBytes());
            for (String endpointId : connectedEndpoints) {
                connectionsClient.sendPayload(endpointId, payload);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error creating message JSON", e);
        }
    }

    @ReactMethod
    public void sendImage(String base64Image) {
        try {
            // Decode base64 image
            byte[] imageBytes = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);
            
            if (bitmap == null) {
                Log.e(TAG, "Failed to decode image");
                return;
            }

            // Compress image
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, IMAGE_COMPRESSION_QUALITY, outputStream);
            byte[] compressedImage = outputStream.toByteArray();

            // Check size
            if (compressedImage.length > MAX_IMAGE_SIZE) {
                Log.e(TAG, "Image size exceeds 5MB limit after compression");
                return;
            }

            // Create message JSON
            JSONObject messageJson = new JSONObject();
            messageJson.put("type", MESSAGE_TYPE_IMAGE);
            messageJson.put("content", Base64.encodeToString(compressedImage, Base64.DEFAULT));
            messageJson.put("timestamp", System.currentTimeMillis());

            // Send payload
            Payload payload = Payload.fromBytes(messageJson.toString().getBytes());
            for (String endpointId : connectedEndpoints) {
                connectionsClient.sendPayload(endpointId, payload);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing image", e);
        }
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
                    connectedEndpoints.add(endpointId);
                    params.putInt("state", 2); // Connected
                    break;
                case ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED:
                    connectedEndpoints.remove(endpointId);
                    params.putInt("state", 0); // Not Connected
                    break;
                case ConnectionsStatusCodes.STATUS_ERROR:
                    connectedEndpoints.remove(endpointId);
                    params.putInt("state", 0); // Not Connected
                    break;
                default:
                    params.putInt("state", 1); // Connecting
            }
            
            sendEvent("connectionStateChanged", params);
        }

        @Override
        public void onDisconnected(String endpointId) {
            connectedEndpoints.remove(endpointId);
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
                String messageJson = new String(payload.asBytes());
                try {
                    JSONObject json = new JSONObject(messageJson);
                    WritableMap params = Arguments.createMap();
                    params.putString("peerId", endpointId);
                    params.putString("type", json.getString("type"));
                    params.putString("content", json.getString("content"));
                    params.putDouble("timestamp", json.getDouble("timestamp"));
                    sendEvent("messageReceived", params);
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing message JSON", e);
                }
            }
        }

        @Override
        public void onPayloadTransferUpdate(String endpointId, PayloadTransferUpdate update) {
            // Handle transfer updates if needed
        }
    };
} 