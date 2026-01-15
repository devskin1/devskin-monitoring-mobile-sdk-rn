/**
 * DevSkin Mobile SDK - Performance Collector
 * Tracks app startup, screen render times, frame rate, memory usage
 */

export class PerformanceCollector {
  sessionId = '';
  appStartTime = 0;
  screenTimings = new Map();
  frameMonitorId = null;
  memoryMonitorId = null;
  metrics = {};
  constructor(config, transport) {
    this.config = config;
    this.transport = transport;
  }
  start() {
    if (!this.config.performance?.enabled) return;

    // Track app startup time
    if (this.config.performance.trackAppStartTime) {
      this.trackAppStartTime();
    }

    // Monitor frame rate (React Native Performance Monitor style)
    this.startFrameMonitor();

    // Monitor memory usage
    this.startMemoryMonitor();
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Performance collector started');
    }
  }
  stop() {
    if (this.frameMonitorId) {
      clearInterval(this.frameMonitorId);
      this.frameMonitorId = null;
    }
    if (this.memoryMonitorId) {
      clearInterval(this.memoryMonitorId);
      this.memoryMonitorId = null;
    }
  }
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Called when app becomes active (for cold start measurement)
   */
  markAppReady() {
    if (this.appStartTime > 0) {
      const coldStartTime = Date.now() - this.appStartTime;
      this.metrics.appStartTime = coldStartTime;
      this.transport.sendPerformanceMetric({
        sessionId: this.sessionId,
        metricName: 'AppColdStart',
        value: coldStartTime,
        timestamp: new Date().toISOString()
      });
      if (this.config.debug) {
        console.log('[DevSkin Mobile] Cold start time:', coldStartTime, 'ms');
      }
    }
  }

  /**
   * Track screen render time
   */
  startScreenRender(screenName) {
    if (!this.config.performance?.trackScreenRenderTime) return;
    this.screenTimings.set(screenName, {
      screenName,
      startTime: Date.now()
    });
  }

  /**
   * Mark screen as rendered
   */
  endScreenRender(screenName) {
    if (!this.config.performance?.trackScreenRenderTime) return;
    const timing = this.screenTimings.get(screenName);
    if (timing) {
      const renderTime = Date.now() - timing.startTime;
      timing.renderTime = renderTime;
      this.metrics.screenRenderTime = renderTime;

      // Send metric
      this.transport.sendPerformanceMetric({
        sessionId: this.sessionId,
        metricName: 'ScreenRender',
        value: renderTime,
        screenName,
        timestamp: new Date().toISOString()
      });

      // Check for slow render
      const threshold = this.config.performance?.slowRenderThreshold || 500;
      if (renderTime > threshold) {
        this.transport.sendPerformanceMetric({
          sessionId: this.sessionId,
          metricName: 'SlowRender',
          value: renderTime,
          screenName,
          timestamp: new Date().toISOString()
        });
        if (this.config.debug) {
          console.log('[DevSkin Mobile] Slow screen render:', screenName, renderTime, 'ms');
        }
      }
      this.screenTimings.delete(screenName);
    }
  }

  /**
   * Track time to interactive
   */
  markInteractive(screenName) {
    const timing = this.screenTimings.get(screenName);
    if (timing && timing.renderTime) {
      const tti = Date.now() - timing.startTime;
      this.metrics.timeToInteractive = tti;
      this.transport.sendPerformanceMetric({
        sessionId: this.sessionId,
        metricName: 'TimeToInteractive',
        value: tti,
        screenName,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Report custom performance metric
   */
  reportMetric(name, value, context) {
    this.transport.sendPerformanceMetric({
      sessionId: this.sessionId,
      metricName: name,
      value,
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics
    };
  }

  // Private methods
  trackAppStartTime() {
    // In React Native, we can use Performance.now() if available
    // or track from module load time
    this.appStartTime = Date.now();

    // Listen for app state changes to detect when app becomes active
    // In real implementation, use AppState from react-native
    // AppState.addEventListener('change', (state) => {
    //   if (state === 'active') this.markAppReady();
    // });
  }
  startFrameMonitor() {
    // React Native doesn't have requestAnimationFrame in the same way
    // We use InteractionManager and a polling approach

    let frameCount = 0;
    let lastTime = Date.now();
    const SAMPLE_INTERVAL = 1000; // Sample every second

    // Use a simple interval-based approach
    // In production, use native module for accurate frame timing
    this.frameMonitorId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTime;
      if (elapsed >= SAMPLE_INTERVAL) {
        // Calculate FPS (this is approximate without native module)
        const fps = Math.round(frameCount * 1000 / elapsed);
        frameCount = 0;
        lastTime = now;
        this.metrics.frameRate = fps;

        // Report if FPS drops below threshold
        if (fps < 30) {
          this.transport.sendPerformanceMetric({
            sessionId: this.sessionId,
            metricName: 'LowFPS',
            value: fps,
            timestamp: new Date().toISOString()
          });
          if (this.config.debug) {
            console.log('[DevSkin Mobile] Low FPS detected:', fps);
          }
        }
      }
      frameCount++;
    }, 16); // ~60fps target
  }
  startMemoryMonitor() {
    // Memory monitoring requires native module
    // This is a placeholder that would call native code

    this.memoryMonitorId = setInterval(() => {
      // In real implementation, call native module to get memory info
      // NativeModules.DevSkinPerformance.getMemoryInfo()
      //   .then((info) => {
      //     this.metrics.memoryUsage = info.used;
      //     if (info.used / info.total > 0.9) {
      //       // Memory warning
      //     }
      //   });

      // Placeholder using JS heap if available
      if (typeof performance !== 'undefined' && performance.memory) {
        const memory = performance.memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;

        // Check for high memory usage
        if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
          this.transport.sendPerformanceMetric({
            sessionId: this.sessionId,
            metricName: 'HighMemory',
            value: memory.usedJSHeapSize,
            context: {
              limit: memory.jsHeapSizeLimit,
              total: memory.totalJSHeapSize
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 10000); // Check every 10 seconds
  }
}
//# sourceMappingURL=performance.js.map