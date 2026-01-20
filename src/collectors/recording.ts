/**
 * DevSkin Mobile SDK - Recording Collector
 * Captures events in a format compatible with session replay
 * Uses a simplified rrweb-compatible format for mobile
 */

import { DevSkinMobileConfig } from '../types';
import { MobileTransport } from '../transport';

// Simplified event types (compatible with rrweb)
const EVENT_TYPES = {
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5,
};

// IncrementalSnapshot sources
const SOURCES = {
  MouseInteraction: 2,
  Scroll: 3,
  TouchMove: 6,
};

// Mouse/Touch interaction types
const INTERACTION_TYPES = {
  TouchStart: 7,
  TouchEnd: 9,
};

interface RecordingEvent {
  type: number;
  data: any;
  timestamp: number;
}

export class RecordingCollector {
  private _sessionId: string = '';
  private currentScreen: string = '';
  private screenWidth: number = 375;
  private screenHeight: number = 812;
  private events: RecordingEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL: number;
  private readonly MAX_EVENTS = 100;

  constructor(
    private config: DevSkinMobileConfig,
    private transport: MobileTransport
  ) {
    this.FLUSH_INTERVAL = config.recordingOptions?.flushInterval || 5000;
  }

  start(): void {
    if (!this.config.recordingOptions?.enabled) return;

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);

    if (this.config.debug) {
      console.log('[DevSkin Mobile] Recording collector started');
    }
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;
  }

  setScreenDimensions(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * Record a screen change (creates a FullSnapshot-like event)
   */
  recordScreenChange(screenName: string): void {
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
        height: this.screenHeight,
      },
      timestamp: Date.now(),
    });

    // Also send Meta event with screen info
    this.events.push({
      type: EVENT_TYPES.Meta,
      data: {
        href: screenName,
        width: this.screenWidth,
        height: this.screenHeight,
      },
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  /**
   * Record a touch event
   */
  recordTouch(type: 'tap' | 'longPress' | 'swipe', x: number, y: number, extra?: any): void {
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
        ...extra,
      },
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  /**
   * Record a scroll event
   */
  recordScroll(scrollY: number, scrollDepth: number): void {
    if (!this.config.recordingOptions?.enabled) return;

    this.events.push({
      type: EVENT_TYPES.IncrementalSnapshot,
      data: {
        source: SOURCES.Scroll,
        y: scrollY,
        scrollDepth,
        screenName: this.currentScreen,
      },
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  /**
   * Record a swipe/gesture event
   */
  recordSwipe(startX: number, startY: number, endX: number, endY: number, direction: string): void {
    if (!this.config.recordingOptions?.enabled) return;

    this.events.push({
      type: EVENT_TYPES.IncrementalSnapshot,
      data: {
        source: SOURCES.TouchMove,
        positions: [
          { x: startX, y: startY, timeOffset: 0 },
          { x: endX, y: endY, timeOffset: 100 },
        ],
        direction,
        screenName: this.currentScreen,
      },
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  /**
   * Record a custom event
   */
  recordCustomEvent(tag: string, payload: any): void {
    if (!this.config.recordingOptions?.enabled) return;

    this.events.push({
      type: EVENT_TYPES.Custom,
      data: {
        tag,
        payload: {
          ...payload,
          screenName: this.currentScreen,
        },
      },
      timestamp: Date.now(),
    });

    this.checkFlush();
  }

  /**
   * Flush events to backend
   */
  async flush(): Promise<void> {
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

  private checkFlush(): void {
    if (this.events.length >= this.MAX_EVENTS) {
      this.flush();
    }
  }
}
