/**
 * DevSkin Mobile SDK - Recording Collector
 * Captures events in a format compatible with session replay
 * Uses a simplified rrweb-compatible format for mobile
 */

// Simplified event types (compatible with rrweb)
const EVENT_TYPES = {
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5
};

// IncrementalSnapshot sources
const SOURCES = {
  MouseInteraction: 2,
  Scroll: 3,
  TouchMove: 6
};

// Mouse/Touch interaction types
const INTERACTION_TYPES = {
  TouchStart: 7,
  TouchEnd: 9
};
export class RecordingCollector {
  _sessionId = '';
  currentScreen = '';
  screenWidth = 375;
  screenHeight = 812;
  events = [];
  flushInterval = null;
  MAX_EVENTS = 100;
  constructor(config, transport) {
    this.config = config;
    this.transport = transport;
    this.FLUSH_INTERVAL = config.recordingOptions?.flushInterval || 5000;
  }
  start() {
    if (!this.config.recordingOptions?.enabled) return;

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Recording collector started');
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
  setScreenDimensions(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * Record a screen change (creates a FullSnapshot-like event)
   */
  recordScreenChange(screenName) {
    if (!this.config.recordingOptions?.enabled) return;
    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    // Create a FullSnapshot event for the screen change
    this.events.push({
      type: EVENT_TYPES.FullSnapshot,
      data: {
        screen: screenName,
        previousScreen,
        width: this.screenWidth,
        height: this.screenHeight
      },
      timestamp: Date.now()
    });

    // Also send Meta event with screen info
    this.events.push({
      type: EVENT_TYPES.Meta,
      data: {
        href: screenName,
        width: this.screenWidth,
        height: this.screenHeight
      },
      timestamp: Date.now()
    });
    this.checkFlush();
  }

  /**
   * Record a touch event
   */
  recordTouch(type, x, y, extra) {
    if (!this.config.recordingOptions?.enabled) return;
    this.events.push({
      type: EVENT_TYPES.IncrementalSnapshot,
      data: {
        source: SOURCES.MouseInteraction,
        type: type === 'tap' ? INTERACTION_TYPES.TouchEnd : INTERACTION_TYPES.TouchStart,
        x,
        y,
        touchType: type,
        screenName: this.currentScreen,
        ...extra
      },
      timestamp: Date.now()
    });
    this.checkFlush();
  }

  /**
   * Record a scroll event
   */
  recordScroll(scrollY, scrollDepth) {
    if (!this.config.recordingOptions?.enabled) return;
    this.events.push({
      type: EVENT_TYPES.IncrementalSnapshot,
      data: {
        source: SOURCES.Scroll,
        y: scrollY,
        scrollDepth,
        screenName: this.currentScreen
      },
      timestamp: Date.now()
    });
    this.checkFlush();
  }

  /**
   * Record a swipe/gesture event
   */
  recordSwipe(startX, startY, endX, endY, direction) {
    if (!this.config.recordingOptions?.enabled) return;
    this.events.push({
      type: EVENT_TYPES.IncrementalSnapshot,
      data: {
        source: SOURCES.TouchMove,
        positions: [{
          x: startX,
          y: startY,
          timeOffset: 0
        }, {
          x: endX,
          y: endY,
          timeOffset: 100
        }],
        direction,
        screenName: this.currentScreen
      },
      timestamp: Date.now()
    });
    this.checkFlush();
  }

  /**
   * Record a custom event
   */
  recordCustomEvent(tag, payload) {
    if (!this.config.recordingOptions?.enabled) return;
    this.events.push({
      type: EVENT_TYPES.Custom,
      data: {
        tag,
        payload: {
          ...payload,
          screenName: this.currentScreen
        }
      },
      timestamp: Date.now()
    });
    this.checkFlush();
  }

  /**
   * Flush events to backend
   */
  async flush() {
    if (this.events.length === 0) return;
    const eventsToSend = [...this.events];
    this.events = [];
    try {
      await this.transport.sendRecordingEvents(eventsToSend);
      if (this.config.debug) {
        console.log(`[DevSkin Mobile] Sent ${eventsToSend.length} recording events`);
      }
    } catch (error) {
      // Re-add events on failure
      this.events.unshift(...eventsToSend);
      if (this.config.debug) {
        console.error('[DevSkin Mobile] Failed to send recording events:', error);
      }
    }
  }
  checkFlush() {
    if (this.events.length >= this.MAX_EVENTS) {
      this.flush();
    }
  }
}
//# sourceMappingURL=recording.js.map