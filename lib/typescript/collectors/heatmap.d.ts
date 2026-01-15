/**
 * DevSkin Mobile SDK - Heatmap/Touch Collector
 * Tracks touches, gestures, and scroll behavior for mobile heatmaps
 */
import { DevSkinMobileConfig } from '../types';
import { MobileTransport } from '../transport';
export declare class HeatmapCollector {
    private config;
    private transport;
    private _sessionId;
    private _anonymousId;
    private currentScreen;
    private screenWidth;
    private screenHeight;
    private touchQueue;
    private scrollQueue;
    private maxScrollDepth;
    private scrollStartY;
    private touchStartTime;
    private touchStartPoint;
    private longPressTimeout;
    private readonly LONG_PRESS_DURATION;
    private readonly SWIPE_THRESHOLD;
    private readonly SWIPE_VELOCITY_THRESHOLD;
    private flushInterval;
    private readonly FLUSH_INTERVAL;
    private readonly MAX_QUEUE_SIZE;
    constructor(config: DevSkinMobileConfig, transport: MobileTransport);
    start(): void;
    stop(): void;
    setSessionId(sessionId: string): void;
    setAnonymousId(anonymousId: string): void;
    setCurrentScreen(screenName: string): void;
    setScreenDimensions(width: number, height: number): void;
    /**
     * Track a touch start event
     */
    onTouchStart(x: number, y: number, force?: number): void;
    /**
     * Track a touch end event
     */
    onTouchEnd(x: number, y: number): void;
    /**
     * Track a touch move event (for drag tracking)
     */
    onTouchMove(_x: number, _y: number): void;
    /**
     * Track scroll event
     */
    onScroll(scrollY: number, contentHeight: number, viewportHeight: number): void;
    /**
     * Track pinch gesture (zoom)
     */
    onPinch(scale: number, x: number, y: number): void;
    /**
     * Manually record a touch on an element
     */
    recordElementTouch(elementType: string, elementId?: string, elementLabel?: string, x?: number, y?: number): void;
    /**
     * Flush all queued data to backend
     */
    flush(): void;
    private recordTouch;
    private getSwipeDirection;
}
//# sourceMappingURL=heatmap.d.ts.map