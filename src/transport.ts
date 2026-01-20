/**
 * DevSkin Mobile SDK Transport Layer
 * Handles all communication with the backend
 * Uses same endpoints as browser SDK for compatibility
 */

import {
  DevSkinMobileConfig,
  EventData,
  UserData,
  SessionData,
  NetworkRequest,
  CrashData,
  TouchData,
  ScrollData,
  ScreenViewData,
  ScreenshotData,
} from './types';

interface QueuedItem {
  type: 'event' | 'session' | 'error' | 'network' | 'performance' | 'heatmap' | 'screen';
  data: any;
  timestamp: number;
  retryCount: number;
}

export class MobileTransport {
  private queue: QueuedItem[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly maxQueueSize = 30;
  private readonly flushIntervalMs = 5000; // 5 seconds
  private readonly maxRetries = 3;
  private readonly apiUrl: string;
  private sessionId: string | null = null;
  private _isOnline: boolean = true;
  private _offlineQueue: QueuedItem[] = [];

  constructor(private config: DevSkinMobileConfig) {
    this.apiUrl = config.apiUrl || 'https://api-monitoring.devskin.com';
    this.startPeriodicFlush();
    this.setupNetworkListener();
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  // Session endpoints
  async startSession(session: SessionData): Promise<void> {
    await this.sendToBackend('/v1/rum/sessions', session);
  }

  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    await this.sendToBackend(`/v1/rum/sessions/${sessionId}`, data, 'PUT');
  }

  // Event endpoints
  sendEvent(event: EventData): void {
    this.enqueue('event', event);
  }

  async sendEventBatch(events: EventData[]): Promise<void> {
    await this.sendToBackend('/v1/rum/events/batch', { events });
  }

  // User identification
  async identifyUser(user: UserData): Promise<void> {
    await this.sendToBackend('/v1/analytics/identify', user);
  }

  // Screen view
  sendScreenView(screenView: ScreenViewData): void {
    this.enqueue('screen', screenView);
  }

  // Error/Crash endpoints
  sendError(error: CrashData): void {
    // Errors are sent immediately due to potential crash
    this.sendToBackend('/v1/errors/errors', error).catch(() => {
      // On failure, queue for retry
      this.enqueue('error', error);
    });
  }

  // Network request tracking
  sendNetworkRequest(request: NetworkRequest): void {
    this.enqueue('network', request);
  }

  // Performance metrics
  sendPerformanceMetric(metric: any): void {
    this.enqueue('performance', metric);
  }

  // Heatmap/Touch data
  sendTouchData(touch: TouchData): void {
    this.enqueue('heatmap', {
      ...touch,
    });
  }

  sendScrollData(scroll: ScrollData): void {
    this.enqueue('heatmap', {
      type: 'scroll',
      ...scroll,
    });
  }

  // Screenshot
  async sendScreenshot(screenshot: ScreenshotData): Promise<void> {
    // Screenshots are sent immediately, not queued
    await this.sendToBackend('/v1/sdk/screenshot', {
      screenshot: {
        session_id: screenshot.sessionId,
        page_url: screenshot.screenName,
        screenshot: screenshot.screenshot,
        width: screenshot.width,
        height: screenshot.height,
        timestamp: screenshot.timestamp,
      },
    });
  }

  // Recording events (for session replay)
  async sendRecordingEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    await this.sendToBackend('/v1/rum/recordings', {
      session_id: this.sessionId,
      events,
      timestamp: new Date().toISOString(),
    });
  }

  // Manual flush
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const items = [...this.queue];
    this.queue = [];

    // Group by type for batch sending
    const grouped: Record<string, any[]> = {};
    items.forEach((item) => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type]!.push(item.data);
    });

    // Send each type to appropriate endpoint
    const promises = Object.entries(grouped).map(async ([type, dataArray]) => {
      const endpoint = this.getEndpointForType(type);

      try {
        if (type === 'event' && dataArray.length > 1) {
          // Batch events
          await this.sendToBackend('/v1/rum/events/batch', { events: dataArray });
        } else if (type === 'heatmap') {
          // Heatmap batch
          await this.sendToBackend(endpoint, {
            heatmaps: dataArray,
            apiKey: this.config.apiKey,
            appId: this.config.appId,
          });
        } else if (type === 'screen') {
          // Screen views batch
          for (const data of dataArray) {
            await this.sendToBackend('/v1/rum/page-views', data);
          }
        } else {
          // Send individually
          for (const data of dataArray) {
            await this.sendToBackend(endpoint, data);
          }
        }
      } catch (error) {
        // Re-queue failed items
        dataArray.forEach((data) => {
          const originalItem = items.find((i) => i.data === data);
          if (originalItem && originalItem.retryCount < this.maxRetries) {
            this.queue.push({
              ...originalItem,
              retryCount: originalItem.retryCount + 1,
            });
          }
        });
      }
    });

    await Promise.allSettled(promises);

    if (this.config.debug) {
      console.log(`[DevSkin Mobile] Flushed ${items.length} items`);
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  // Private methods
  private enqueue(type: QueuedItem['type'], data: any): void {
    // Add common fields
    const enrichedData = {
      ...data,
      applicationId: this.config.appId,
      sessionId: this.sessionId || data.sessionId,
      platform: 'mobile',
    };

    this.queue.push({
      type,
      data: enrichedData,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Auto-flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  private setupNetworkListener(): void {
    // React Native NetInfo integration would go here
    // For now, assume always online
    // In real implementation, use @react-native-community/netinfo
  }

  private getEndpointForType(type: string): string {
    switch (type) {
      case 'event':
        return '/v1/rum/events';
      case 'error':
        return '/v1/errors/errors';
      case 'network':
        return '/v1/rum/network-requests';
      case 'performance':
        return '/v1/rum/web-vitals';
      case 'heatmap':
        return '/v1/sdk/heatmap';
      case 'screen':
        return '/v1/rum/page-views';
      default:
        return '/v1/rum/events';
    }
  }

  private async sendToBackend(
    endpoint: string,
    data: any,
    method: 'POST' | 'PUT' = 'POST'
  ): Promise<void> {
    const url = `${this.apiUrl}${endpoint}`;

    const payload = {
      ...data,
      apiKey: this.config.apiKey,
      applicationId: this.config.appId,
      environment: this.config.environment,
      release: this.config.release,
      appVersion: this.config.appVersion,
    };

    // Apply beforeSend hook
    if (this.config.beforeSend) {
      const processed = this.config.beforeSend(payload);
      if (!processed) {
        return; // Hook returned null, don't send
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-App-Id': this.config.appId,
          'X-Platform': 'mobile',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (this.config.debug) {
        console.log(`[DevSkin Mobile] Sent to ${endpoint}:`, response.status);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`[DevSkin Mobile] Failed to send to ${endpoint}:`, error);
      }
      throw error;
    }
  }
}
