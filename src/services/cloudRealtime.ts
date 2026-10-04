import mqtt, { MqttClient } from 'mqtt';
import { RideRequest, LiveTrackingData, ChatMessage } from '../types';

/**
 * BeeGo Voltx Global Real-Time Dispatch Service (MQTT over WebSockets)
 * 
 * Works 100% on static hosting (GitHub Pages), preview environments,
 * and across different physical devices (Mobile 4G, WiFi, Desktop)
 * with zero custom server requirements.
 */

const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

const TOPIC_ACTIVE_RIDE = 'beego/voltx/rides/v1/active';
const TOPIC_TRACKING = 'beego/voltx/rides/v1/tracking';
const TOPIC_CHAT = 'beego/voltx/rides/v1/chat';

type RideUpdateHandler = (ride: RideRequest | null) => void;
type TrackingHandler = (data: { rideId: string; tracking: LiveTrackingData }) => void;
type ChatHandler = (data: { rideId: string; message: ChatMessage }) => void;

class CloudRealtimeService {
  private client: MqttClient | null = null;
  private currentBrokerIndex = 0;
  private isConnected = false;
  private rideListeners: Set<RideUpdateHandler> = new Set();
  private trackingListeners: Set<TrackingHandler> = new Set();
  private chatListeners: Set<ChatHandler> = new Set();
  private lastKnownRide: RideRequest | null = null;
  private reconnectTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    if (typeof window === 'undefined') return;

    const brokerUrl = BROKERS[this.currentBrokerIndex];
    const clientId = 'beego_' + Math.random().toString(36).substring(2, 10);

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 3000,
        keepalive: 30,
      });

      this.client.on('connect', () => {
        console.log('[Cloud Realtime] Connected to dispatch broker:', brokerUrl);
        this.isConnected = true;

        // Subscribe to active ride updates (including retained messages)
        this.client?.subscribe([TOPIC_ACTIVE_RIDE, TOPIC_TRACKING, TOPIC_CHAT], { qos: 1 }, (err) => {
          if (err) {
            console.warn('[Cloud Realtime] Subscription error:', err);
          } else {
            console.log('[Cloud Realtime] Subscribed to ride dispatch channels.');
          }
        });
      });

      this.client.on('message', (topic, payload) => {
        try {
          const raw = payload.toString().trim();

          if (topic === TOPIC_ACTIVE_RIDE) {
            if (!raw || raw === '{}') {
              this.lastKnownRide = null;
              this.notifyRideListeners(null);
            } else {
              const ride = JSON.parse(raw) as RideRequest;
              this.lastKnownRide = ride;
              this.notifyRideListeners(ride);
            }
          } else if (topic === TOPIC_TRACKING) {
            if (raw) {
              const data = JSON.parse(raw);
              this.trackingListeners.forEach((fn) => {
                try { fn(data); } catch (e) {}
              });
            }
          } else if (topic === TOPIC_CHAT) {
            if (raw) {
              const data = JSON.parse(raw);
              this.chatListeners.forEach((fn) => {
                try { fn(data); } catch (e) {}
              });
            }
          }
        } catch (e) {
          console.warn('[Cloud Realtime] Error parsing incoming message:', e);
        }
      });

      this.client.on('error', (err) => {
        console.warn('[Cloud Realtime] Broker error:', err.message);
        this.rotateBroker();
      });

      this.client.on('offline', () => {
        this.isConnected = false;
      });
    } catch (err) {
      console.warn('[Cloud Realtime] Init error:', err);
      this.rotateBroker();
    }
  }

  private rotateBroker() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      try {
        this.client?.end(true);
      } catch (e) {}
      this.currentBrokerIndex = (this.currentBrokerIndex + 1) % BROKERS.length;
      console.log('[Cloud Realtime] Rotating to backup broker...');
      this.connect();
    }, 2000);
  }

  public publishRide(ride: RideRequest | null) {
    if (!this.client || !this.isConnected) {
      // Reconnect if needed
      if (!this.client) this.connect();
    }

    try {
      if (ride) {
        const payload = JSON.stringify(ride);
        this.client?.publish(TOPIC_ACTIVE_RIDE, payload, { retain: true, qos: 1 });
      } else {
        // Clearing retained message
        this.client?.publish(TOPIC_ACTIVE_RIDE, '', { retain: true, qos: 1 });
      }
    } catch (e) {
      console.warn('[Cloud Realtime] Publish error:', e);
    }
  }

  public publishTracking(rideId: string, tracking: LiveTrackingData) {
    try {
      this.client?.publish(TOPIC_TRACKING, JSON.stringify({ rideId, tracking }), { qos: 0 });
    } catch (e) {}
  }

  public publishChat(rideId: string, message: ChatMessage) {
    try {
      this.client?.publish(TOPIC_CHAT, JSON.stringify({ rideId, message }), { qos: 1 });
    } catch (e) {}
  }

  public subscribeRide(handler: RideUpdateHandler): () => void {
    this.rideListeners.add(handler);
    // If we already have a retained ride in memory, notify handler immediately
    if (this.lastKnownRide) {
      try { handler(this.lastKnownRide); } catch (e) {}
    }
    return () => {
      this.rideListeners.delete(handler);
    };
  }

  public subscribeTracking(handler: TrackingHandler): () => void {
    this.trackingListeners.add(handler);
    return () => {
      this.trackingListeners.delete(handler);
    };
  }

  public subscribeChat(handler: ChatHandler): () => void {
    this.chatListeners.add(handler);
    return () => {
      this.chatListeners.delete(handler);
    };
  }

  private notifyRideListeners(ride: RideRequest | null) {
    this.rideListeners.forEach((fn) => {
      try { fn(ride); } catch (e) {}
    });
  }
}

export const cloudRealtime = new CloudRealtimeService();
