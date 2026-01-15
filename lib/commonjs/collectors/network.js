"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NetworkCollector = void 0;
/**
 * DevSkin Mobile SDK - Network Collector
 * Intercepts fetch, axios, and XMLHttpRequest calls
 */

class NetworkCollector {
  sessionId = '';
  constructor(config, transport) {
    this.config = config;
    this.transport = transport;
  }
  start() {
    if (!this.config.performance?.trackNetworkRequests) return;
    this.interceptFetch();
    this.interceptXHR();
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Network collector started');
    }
  }
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Manually track a network request (for native modules)
   */
  trackRequest(request) {
    if (this.shouldIgnoreUrl(request.url)) return;
    const networkRequest = {
      ...request,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };
    this.transport.sendNetworkRequest(networkRequest);
  }

  // Private methods
  interceptFetch() {
    const originalFetch = global.fetch;
    const self = this;
    global.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      const method = init?.method || 'GET';
      const startTime = Date.now();
      try {
        const response = await originalFetch.call(this, input, init);
        const duration = Date.now() - startTime;

        // Clone response to read size
        const clonedResponse = response.clone();
        if (!self.shouldIgnoreUrl(url)) {
          const networkRequest = {
            sessionId: self.sessionId,
            url: self.sanitizeUrl(url),
            method: method.toUpperCase(),
            statusCode: response.status,
            durationMs: duration,
            responseSize: await self.getResponseSize(clonedResponse),
            timestamp: new Date().toISOString(),
            initiator: 'fetch'
          };

          // Capture headers if enabled
          if (self.config.networkOptions?.captureHeaders) {
            networkRequest.responseHeaders = self.headersToObject(response.headers);
          }

          // Capture error for failed requests
          if (!response.ok) {
            networkRequest.errorMessage = `HTTP ${response.status} ${response.statusText}`;
          }

          // Check if should only capture failed
          if (!self.config.networkOptions?.captureFailedOnly || !response.ok) {
            self.transport.sendNetworkRequest(networkRequest);
          }
          if (self.config.debug) {
            console.log('[DevSkin Mobile] Network request:', networkRequest.url, response.status);
          }
        }
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        if (!self.shouldIgnoreUrl(url)) {
          const networkRequest = {
            sessionId: self.sessionId,
            url: self.sanitizeUrl(url),
            method: method.toUpperCase(),
            durationMs: duration,
            timestamp: new Date().toISOString(),
            initiator: 'fetch',
            errorMessage: error instanceof Error ? error.message : 'Network request failed'
          };
          self.transport.sendNetworkRequest(networkRequest);
          if (self.config.debug) {
            console.log('[DevSkin Mobile] Network request failed:', networkRequest.url);
          }
        }
        throw error;
      }
    };
  }
  interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const self = this;
    XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
      this.__devskin = {
        method,
        url: url.toString(),
        startTime: 0
      };
      return originalOpen.apply(this, [method, url, async ?? true, username, password]);
    };
    XMLHttpRequest.prototype.send = function (body) {
      const xhr = this;
      const devskin = xhr.__devskin;
      if (devskin) {
        devskin.startTime = Date.now();
        const handleLoad = () => {
          const duration = Date.now() - devskin.startTime;
          if (!self.shouldIgnoreUrl(devskin.url)) {
            const networkRequest = {
              sessionId: self.sessionId,
              url: self.sanitizeUrl(devskin.url),
              method: devskin.method.toUpperCase(),
              statusCode: xhr.status,
              durationMs: duration,
              timestamp: new Date().toISOString(),
              initiator: 'xhr'
            };
            if (xhr.status === 0 || xhr.status >= 400) {
              networkRequest.errorMessage = `HTTP ${xhr.status} ${xhr.statusText}`;
            }
            if (!self.config.networkOptions?.captureFailedOnly || xhr.status >= 400) {
              self.transport.sendNetworkRequest(networkRequest);
            }
          }
        };
        const handleError = () => {
          const duration = Date.now() - devskin.startTime;
          if (!self.shouldIgnoreUrl(devskin.url)) {
            const networkRequest = {
              sessionId: self.sessionId,
              url: self.sanitizeUrl(devskin.url),
              method: devskin.method.toUpperCase(),
              durationMs: duration,
              timestamp: new Date().toISOString(),
              initiator: 'xhr',
              errorMessage: 'XHR request failed'
            };
            self.transport.sendNetworkRequest(networkRequest);
          }
        };
        xhr.addEventListener('load', handleLoad);
        xhr.addEventListener('error', handleError);
        xhr.addEventListener('abort', handleError);
        xhr.addEventListener('timeout', handleError);
      }
      return originalSend.call(this, body);
    };
  }
  shouldIgnoreUrl(url) {
    // Always ignore DevSkin API calls
    if (url.includes(this.config.apiUrl || 'api-monitoring.devskin.com')) {
      return true;
    }

    // Check custom ignore patterns
    const ignorePatterns = this.config.networkOptions?.ignoreUrls || [];
    for (const pattern of ignorePatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }
    return false;
  }
  sanitizeUrl(url) {
    try {
      const parsed = new URL(url);

      // Remove sensitive query params
      const sensitiveParams = ['token', 'key', 'apikey', 'api_key', 'password', 'secret', 'auth'];
      sensitiveParams.forEach(param => {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '[REDACTED]');
        }
      });
      return parsed.toString();
    } catch {
      return url;
    }
  }
  async getResponseSize(response) {
    try {
      const blob = await response.blob();
      return blob.size;
    } catch {
      return undefined;
    }
  }
  headersToObject(headers) {
    const obj = {};
    headers.forEach((value, key) => {
      // Skip sensitive headers
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else {
        obj[key] = value;
      }
    });
    return obj;
  }
}
exports.NetworkCollector = NetworkCollector;
//# sourceMappingURL=network.js.map