/**
 * DevSkin Mobile SDK for React Native
 * Complete mobile monitoring: Sessions, Events, Errors, Network, Performance, Heatmaps
 *
 * @example
 * import DevSkin from '@devskin/mobile-sdk-react-native';
 *
 * DevSkin.init({
 *   apiKey: 'your-api-key',
 *   appId: 'your-app-id',
 * });
 */
import { DevSkinMobileConfig, Breadcrumb } from './types';
export * from './types';
declare class DevSkinMobileSDK {
    private config;
    private transport;
    private sessionId;
    private userId;
    private anonymousId;
    private _sessionStartTime;
    private initialized;
    private initializing;
    private currentScreen;
    private userTraits;
    private deviceCollector;
    private errorCollector;
    private networkCollector;
    private performanceCollector;
    private heatmapCollector;
    private recordingCollector;
    private deviceInfo;
    private appInfo;
    private appState;
    private isOptedOut;
    /**
     * Initialize the DevSkin Mobile SDK
     */
    init(config: DevSkinMobileConfig): Promise<void>;
    /**
     * Track a custom event
     */
    track(eventName: string, properties?: Record<string, any>): void;
    /**
     * Track a screen view
     */
    trackScreen(screenName: string, properties?: Record<string, any>): void;
    /**
     * Mark current screen as rendered (for performance timing)
     */
    markScreenRendered(screenName?: string): void;
    /**
     * Identify a user
     */
    identify(userId: string, traits?: Record<string, any>): void;
    /**
     * Set user properties without full identification
     */
    setUser(user: {
        id?: string;
    } & Record<string, any>): void;
    /**
     * Clear user data (on logout)
     */
    clearUser(): void;
    /**
     * Capture an error manually
     */
    captureError(error: Error, context?: Record<string, any>): void;
    /**
     * Add a breadcrumb
     */
    addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void;
    /**
     * Track a touch event (for heatmaps and recording)
     */
    trackTouch(type: 'tap' | 'longPress' | 'swipe', x: number, y: number, extra?: Record<string, any>): void;
    /**
     * Track scroll for heatmaps and recording
     */
    trackScroll(scrollY: number, contentHeight: number, viewportHeight: number): void;
    /**
     * Capture and send a screenshot of the current screen
     * Requires react-native-view-shot to be installed
     *
     * @example
     * import { captureScreen } from 'react-native-view-shot';
     *
     * const uri = await captureScreen({ format: 'jpg', quality: 0.7 });
     * await DevSkin.captureScreenshot(uri);
     */
    captureScreenshot(imageUri: string, options?: {
        width?: number;
        height?: number;
    }): Promise<void>;
    /**
     * Capture screenshot from base64 directly (no file system needed)
     */
    captureScreenshotFromBase64(base64Image: string, options?: {
        width?: number;
        height?: number;
    }): Promise<void>;
    /**
     * Report a custom performance metric
     */
    reportPerformance(name: string, value: number, context?: Record<string, any>): void;
    /**
     * Opt out of all tracking
     */
    optOut(): void;
    /**
     * Opt back into tracking
     */
    optIn(): void;
    /**
     * Check if user is opted out
     */
    isUserOptedOut(): boolean;
    /**
     * Get current session ID
     */
    getSessionId(): string | null;
    /**
     * Get anonymous ID
     */
    getAnonymousId(): string | null;
    /**
     * Manually flush all pending events
     */
    flush(): Promise<void>;
    /**
     * Destroy the SDK (cleanup)
     */
    destroy(): void;
    private isReady;
    private initializeCollectors;
    private startSession;
    private getPlatform;
    private setupAppStateListener;
    private setupDimensionListener;
    private getOrCreateAnonymousId;
    private generateId;
}
declare const DevSkin: DevSkinMobileSDK;
export default DevSkin;
export { DevSkinMobileSDK };
export { ErrorCollector } from './collectors/error';
export { NetworkCollector } from './collectors/network';
export { PerformanceCollector } from './collectors/performance';
export { HeatmapCollector } from './collectors/heatmap';
export { DeviceCollector } from './collectors/device';
export { RecordingCollector } from './collectors/recording';
export { MobileTransport } from './transport';
//# sourceMappingURL=index.d.ts.map