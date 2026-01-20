/**
 * DevSkin Mobile SDK Transport Layer
 * Handles all communication with the backend
 * Uses same endpoints as browser SDK for compatibility
 */

export class MobileTransport {
  queue = [];
  flushInterval = null;
  maxQueueSize = 30;
  flushIntervalMs = 5000; // 5 seconds
  maxRetries = 3;
  sessionId = null;
  _isOnline = true;
  _offlineQueue = [];
  constructor(config) {
    this.config = config;
    this.apiUrl = config.apiUrl || 'https://api-monitoring.devskin.com';
    this.startPeriodicFlush();
    this.setupNetworkListener();
  }
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  // Session endpoints
  async startSession(session) {
    await this.sendToBackend('/v1/rum/sessions', session);
  }
  async updateSession(sessionId, data) {
    await this.sendToBackend(`/v1/rum/sessions/${sessionId}`, data, 'PUT');
  }

  // Event endpoints
  sendEvent(event) {
    this.enqueue('event', event);
  }
  async sendEventBatch(events) {
    await this.sendToBackend('/v1/rum/events/batch', {
      events
    });
  }

  // User identification
  async identifyUser(user) {
    await this.sendToBackend('/v1/analytics/identify', user);
  }

  // Screen view
  sendScreenView(screenView) {
    this.enqueue('screen', screenView);
  }

  // Error/Crash endpoints
  sendError(error) {
    // Errors are sent immediately due to potential crash
    this.sendToBackend('/v1/errors/errors', error).catch(() => {
      // On failure, queue for retry
      this.enqueue('error', error);
    });
  }

  // Network request tracking
  sendNetworkRequest(request) {
    this.enqueue('network', request);
  }

  // Performance metrics
  sendPerformanceMetric(metric) {
    this.enqueue('performance', metric);
  }

  // Heatmap/Touch data
  sendTouchData(touch) {
    this.enqueue('heatmap', {
      ...touch
    });
  }
  sendScrollData(scroll) {
    this.enqueue('heatmap', {
      type: 'scroll',
      ...scroll
    });
  }

  // Screenshot
  async sendScreenshot(screenshot) {
    // Screenshots are sent immediately, not queued
    await this.sendToBackend('/v1/sdk/screenshot', {
      screenshot: {
        session_id: screenshot.sessionId,
        page_url: screenshot.screenName,
        screenshot: screenshot.screenshot,
        width: screenshot.width,
        height: screenshot.height,
        timestamp: screenshot.timestamp
      }
    });
  }

  // Recording events (for session replay)
  async sendRecordingEvents(events) {
    if (events.length === 0) return;
    await this.sendToBackend('/v1/rum/recordings', {
      session_id: this.sessionId,
      events,
      timestamp: new Date().toISOString()
    });
  }

  // Manual flush
  async flush() {
    if (this.queue.length === 0) return;
    const items = [...this.queue];
    this.queue = [];

    // Group by type for batch sending
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item.data);
    });

    // Send each type to appropriate endpoint
    const promises = Object.entries(grouped).map(async ([type, dataArray]) => {
      const endpoint = this.getEndpointForType(type);
      try {
        if (type === 'event' && dataArray.length > 1) {
          // Batch events
          await this.sendToBackend('/v1/rum/events/batch', {
            events: dataArray
          });
        } else if (type === 'heatmap') {
          // Heatmap batch
          await this.sendToBackend(endpoint, {
            heatmaps: dataArray,
            apiKey: this.config.apiKey,
            appId: this.config.appId
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
        dataArray.forEach(data => {
          const originalItem = items.find(i => i.data === data);
          if (originalItem && originalItem.retryCount < this.maxRetries) {
            this.queue.push({
              ...originalItem,
              retryCount: originalItem.retryCount + 1
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
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  // Private methods
  enqueue(type, data) {
    // Add common fields
    const enrichedData = {
      ...data,
      applicationId: this.config.appId,
      sessionId: this.sessionId || data.sessionId,
      platform: 'mobile'
    };
    this.queue.push({
      type,
      data: enrichedData,
      timestamp: Date.now(),
      retryCount: 0
    });

    // Auto-flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }
  startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }
  setupNetworkListener() {
    // React Native NetInfo integration would go here
    // For now, assume always online
    // In real implementation, use @react-native-community/netinfo
  }
  getEndpointForType(type) {
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
  async sendToBackend(endpoint, data, method = 'POST') {
    const url = `${this.apiUrl}${endpoint}`;
    const payload = {
      ...data,
      apiKey: this.config.apiKey,
      applicationId: this.config.appId,
      environment: this.config.environment,
      release: this.config.release,
      appVersion: this.config.appVersion
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
          'X-Platform': 'mobile'
        },
        body: JSON.stringify(payload)
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
//# sourceMappingURL=transport.js.map