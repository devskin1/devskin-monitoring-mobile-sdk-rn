/**
 * DevSkin Mobile SDK - Performance Collector
 * Tracks app startup, screen render times, frame rate, memory usage
 */
import { DevSkinMobileConfig, MobilePerformanceMetrics } from '../types';
import { MobileTransport } from '../transport';
export declare class PerformanceCollector {
    private config;
    private transport;
    private sessionId;
    private appStartTime;
    private screenTimings;
    private frameMonitorId;
    private memoryMonitorId;
    private metrics;
    constructor(config: DevSkinMobileConfig, transport: MobileTransport);
    start(): void;
    stop(): void;
    setSessionId(sessionId: string): void;
    /**
     * Called when app becomes active (for cold start measurement)
     */
    markAppReady(): void;
    /**
     * Track screen render time
     */
    startScreenRender(screenName: string): void;
    /**
     * Mark screen as rendered
     */
    endScreenRender(screenName: string): void;
    /**
     * Track time to interactive
     */
    markInteractive(screenName: string): void;
    /**
     * Report custom performance metric
     */
    reportMetric(name: string, value: number, context?: Record<string, any>): void;
    /**
     * Get current metrics
     */
    getMetrics(): MobilePerformanceMetrics;
    private trackAppStartTime;
    private startFrameMonitor;
    private startMemoryMonitor;
}
//# sourceMappingURL=performance.d.ts.map