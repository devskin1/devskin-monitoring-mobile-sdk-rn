/**
 * DevSkin Mobile SDK - Error/Crash Collector
 * Captures JavaScript errors, native crashes, ANRs, and OOMs
 */
import { DevSkinMobileConfig, Breadcrumb, MobileDeviceInfo, AppInfo } from '../types';
import { MobileTransport } from '../transport';
export declare class ErrorCollector {
    private config;
    private transport;
    private breadcrumbs;
    private maxBreadcrumbs;
    private sessionId;
    private userId?;
    private currentScreen;
    private deviceInfo?;
    private appInfo?;
    constructor(config: DevSkinMobileConfig, transport: MobileTransport);
    start(): void;
    setSessionId(sessionId: string): void;
    setUserId(userId: string | undefined): void;
    setCurrentScreen(screenName: string): void;
    setDeviceInfo(deviceInfo: MobileDeviceInfo): void;
    setAppInfo(appInfo: AppInfo): void;
    /**
     * Manually capture an error
     */
    captureError(error: Error | string, context?: Record<string, any>, isFatal?: boolean): void;
    /**
     * Capture a native crash (called from native module)
     */
    captureNativeCrash(message: string, nativeStack: string, signal?: string, context?: Record<string, any>): void;
    /**
     * Capture ANR (Application Not Responding) - Android
     */
    captureANR(duration: number, mainThreadStack: string): void;
    /**
     * Capture OOM (Out of Memory)
     */
    captureOOM(memoryInfo?: {
        used: number;
        available: number;
        total: number;
    }): void;
    /**
     * Add a breadcrumb
     */
    addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void;
    /**
     * Get current breadcrumbs
     */
    getBreadcrumbs(): Breadcrumb[];
    /**
     * Clear all breadcrumbs
     */
    clearBreadcrumbs(): void;
    private setupJSErrorHandler;
    private setupPromiseRejectionHandler;
    private setupAutomaticBreadcrumbs;
    private wrapConsole;
    private buildCrashData;
}
//# sourceMappingURL=error.d.ts.map