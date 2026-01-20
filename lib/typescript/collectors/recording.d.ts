/**
 * DevSkin Mobile SDK - Recording Collector
 * Captures events in a format compatible with session replay
 * Uses a simplified rrweb-compatible format for mobile
 */
import { DevSkinMobileConfig } from '../types';
import { MobileTransport } from '../transport';
export declare class RecordingCollector {
    private config;
    private transport;
    private _sessionId;
    private currentScreen;
    private screenWidth;
    private screenHeight;
    private events;
    private flushInterval;
    private readonly FLUSH_INTERVAL;
    private readonly MAX_EVENTS;
    constructor(config: DevSkinMobileConfig, transport: MobileTransport);
    start(): void;
    stop(): void;
    setSessionId(sessionId: string): void;
    setScreenDimensions(width: number, height: number): void;
    /**
     * Record a screen change (creates a FullSnapshot-like event)
     */
    recordScreenChange(screenName: string): void;
    /**
     * Record a touch event
     */
    recordTouch(type: 'tap' | 'longPress' | 'swipe', x: number, y: number, extra?: any): void;
    /**
     * Record a scroll event
     */
    recordScroll(scrollY: number, scrollDepth: number): void;
    /**
     * Record a swipe/gesture event
     */
    recordSwipe(startX: number, startY: number, endX: number, endY: number, direction: string): void;
    /**
     * Record a custom event
     */
    recordCustomEvent(tag: string, payload: any): void;
    /**
     * Flush events to backend
     */
    flush(): Promise<void>;
    private checkFlush;
}
//# sourceMappingURL=recording.d.ts.map