"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HeatmapCollector = void 0;
/**
 * DevSkin Mobile SDK - Heatmap/Touch Collector
 * Tracks touches, gestures, and scroll behavior for mobile heatmaps
 */

class HeatmapCollector {
  _sessionId = '';
  _anonymousId = '';
  currentScreen = '';
  screenWidth = 0;
  screenHeight = 0;

  // Touch tracking
  touchQueue = [];
  scrollQueue = [];

  // Scroll tracking
  maxScrollDepth = new Map();
  scrollStartY = 0;

  // Gesture detection
  touchStartTime = 0;
  touchStartPoint = null;
  longPressTimeout = null;
  LONG_PRESS_DURATION = 500; // ms
  SWIPE_THRESHOLD = 50; // pixels
  SWIPE_VELOCITY_THRESHOLD = 0.3; // pixels/ms

  // Flush interval
  flushInterval = null;
  FLUSH_INTERVAL = 10000; // 10 seconds
  MAX_QUEUE_SIZE = 50;
  constructor(config, transport) {
    this.config = config;
    this.transport = transport;
  }
  start() {
    if (!this.config.heatmapOptions?.enabled) return;

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Heatmap collector started');
    }
  }
  stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
  setSessionId(sessionId) {
    this._sessionId = sessionId;
  }
  setAnonymousId(anonymousId) {
    this._anonymousId = anonymousId;
  }
  setCurrentScreen(screenName) {
    this.currentScreen = screenName;
    // Reset scroll depth for new screen
    this.maxScrollDepth.set(screenName, 0);
  }
  setScreenDimensions(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * Track a touch start event
   */
  onTouchStart(x, y, force) {
    if (!this.config.heatmapOptions?.trackTouches) return;
    this.touchStartTime = Date.now();
    this.touchStartPoint = {
      x,
      y,
      timestamp: Date.now(),
      force
    };

    // Start long press detection
    this.longPressTimeout = setTimeout(() => {
      if (this.touchStartPoint) {
        this.recordTouch('longPress', this.touchStartPoint.x, this.touchStartPoint.y, {
          duration: this.LONG_PRESS_DURATION,
          force: this.touchStartPoint.force
        });
      }
    }, this.LONG_PRESS_DURATION);
  }

  /**
   * Track a touch end event
   */
  onTouchEnd(x, y) {
    if (!this.config.heatmapOptions?.trackTouches) return;

    // Cancel long press detection
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    if (!this.touchStartPoint) return;
    const duration = Date.now() - this.touchStartTime;
    const dx = x - this.touchStartPoint.x;
    const dy = y - this.touchStartPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / duration;

    // Determine gesture type
    if (distance < 10 && duration < this.LONG_PRESS_DURATION) {
      // Tap
      this.recordTouch('tap', this.touchStartPoint.x, this.touchStartPoint.y, {
        duration,
        force: this.touchStartPoint.force
      });
    } else if (distance >= this.SWIPE_THRESHOLD && velocity >= this.SWIPE_VELOCITY_THRESHOLD) {
      // Swipe
      const direction = this.getSwipeDirection(dx, dy);
      this.recordTouch('swipe', this.touchStartPoint.x, this.touchStartPoint.y, {
        direction,
        velocity,
        duration,
        endX: x,
        endY: y
      });
    }
    this.touchStartPoint = null;
  }

  /**
   * Track a touch move event (for drag tracking)
   */
  onTouchMove(_x, _y) {
    // Used for gesture detection, not directly tracked
    // Swipe detection happens in onTouchEnd
  }

  /**
   * Track scroll event
   */
  onScroll(scrollY, contentHeight, viewportHeight) {
    if (!this.config.heatmapOptions?.trackScrolls) return;

    // Calculate scroll depth percentage
    const maxScrollY = contentHeight - viewportHeight;
    const scrollDepth = maxScrollY > 0 ? Math.min(100, Math.round(scrollY / maxScrollY * 100)) : 100;

    // Get previous max scroll depth for this screen
    const previousMax = this.maxScrollDepth.get(this.currentScreen) || 0;

    // Only record if we've scrolled further
    if (scrollDepth > previousMax) {
      this.maxScrollDepth.set(this.currentScreen, scrollDepth);
      const direction = scrollY > this.scrollStartY ? 'down' : 'up';
      const scrollData = {
        screenName: this.currentScreen,
        scrollDepth,
        maxScrollDepth: scrollDepth,
        contentHeight,
        viewportHeight,
        direction,
        timestamp: new Date().toISOString()
      };
      this.scrollQueue.push(scrollData);

      // Flush if queue is full
      if (this.scrollQueue.length >= this.MAX_QUEUE_SIZE) {
        this.flush();
      }
    }
    this.scrollStartY = scrollY;
  }

  /**
   * Track pinch gesture (zoom)
   */
  onPinch(scale, x, y) {
    if (!this.config.heatmapOptions?.trackGestures) return;
    this.recordTouch('pinch', x, y, {
      scale
    });
  }

  /**
   * Manually record a touch on an element
   */
  recordElementTouch(elementType, elementId, elementLabel, x, y) {
    if (!this.config.heatmapOptions?.trackTouches) return;
    this.recordTouch('tap', x || 0, y || 0, {
      elementType,
      elementId,
      elementLabel
    });
  }

  /**
   * Flush all queued data to backend
   */
  flush() {
    // Send touch data
    if (this.touchQueue.length > 0) {
      this.touchQueue.forEach(touch => {
        this.transport.sendTouchData(touch);
      });
      this.touchQueue = [];
    }

    // Send scroll data
    if (this.scrollQueue.length > 0) {
      this.scrollQueue.forEach(scroll => {
        this.transport.sendScrollData(scroll);
      });
      this.scrollQueue = [];
    }
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Heatmap data flushed');
    }
  }

  // Private methods
  recordTouch(type, x, y, extra) {
    // Apply sampling
    const sampling = this.config.heatmapOptions?.touchSampling ?? 1;
    if (Math.random() > sampling) return;
    const touchData = {
      type,
      x,
      y,
      relativeX: this.screenWidth > 0 ? x / this.screenWidth : 0,
      relativeY: this.screenHeight > 0 ? y / this.screenHeight : 0,
      screenName: this.currentScreen,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      timestamp: new Date().toISOString(),
      ...extra
    };
    this.touchQueue.push(touchData);

    // Flush if queue is full
    if (this.touchQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Touch recorded:', type, x, y);
    }
  }
  getSwipeDirection(dx, dy) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }
}
exports.HeatmapCollector = HeatmapCollector;
//# sourceMappingURL=heatmap.js.map