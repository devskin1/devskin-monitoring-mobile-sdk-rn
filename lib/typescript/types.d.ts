/**
 * DevSkin Mobile SDK Types
 * Mirrors browser SDK types for compatibility
 */
export interface DevSkinMobileConfig {
    apiKey: string;
    appId: string;
    apiUrl?: string;
    debug?: boolean;
    sessionTracking?: {
        enabled?: boolean;
        trackScreenViews?: boolean;
        trackUserInteractions?: boolean;
        sessionTimeout?: number;
    };
    crashReporting?: {
        enabled?: boolean;
        captureNativeCrashes?: boolean;
        captureBreadcrumbs?: boolean;
        maxBreadcrumbs?: number;
    };
    performance?: {
        enabled?: boolean;
        trackAppStartTime?: boolean;
        trackScreenRenderTime?: boolean;
        trackNetworkRequests?: boolean;
        slowRenderThreshold?: number;
    };
    heatmapOptions?: {
        enabled?: boolean;
        trackTouches?: boolean;
        trackScrolls?: boolean;
        trackGestures?: boolean;
        touchSampling?: number;
    };
    screenshotOptions?: {
        enabled?: boolean;
        captureOnScreenChange?: boolean;
        quality?: number;
        maxWidth?: number;
        maxHeight?: number;
    };
    recordingOptions?: {
        enabled?: boolean;
        flushInterval?: number;
    };
    networkOptions?: {
        ignoreUrls?: RegExp[];
        captureHeaders?: boolean;
        captureBody?: boolean;
        captureFailedOnly?: boolean;
    };
    analytics?: {
        enabled?: boolean;
        trackUserProperties?: boolean;
        autoTrackScreens?: boolean;
    };
    privacy?: {
        respectDoNotTrack?: boolean;
        maskSensitiveData?: boolean;
        allowedDataTypes?: ('device' | 'location' | 'network' | 'crashes')[];
    };
    environment?: 'development' | 'staging' | 'production';
    release?: string;
    appVersion?: string;
    beforeSend?: (event: any) => any | null;
    onError?: (error: Error) => void;
}
export interface EventData {
    eventName: string;
    eventType: string;
    timestamp: string;
    sessionId?: string;
    userId?: string;
    anonymousId?: string;
    properties?: Record<string, any>;
    screenName?: string;
    screenClass?: string;
}
export interface UserData {
    userId: string;
    anonymousId?: string;
    traits?: Record<string, any>;
    sessionId?: string;
    timestamp: string;
}
export interface SessionData {
    sessionId: string;
    userId?: string;
    anonymousId?: string;
    startedAt: string;
    endedAt?: string;
    durationMs?: number;
    screenViewCount?: number;
    eventCount?: number;
    errorCount?: number;
    platform: 'ios' | 'android' | 'react-native' | 'flutter';
    device?: MobileDeviceInfo;
    app?: AppInfo;
    location?: LocationInfo;
}
export interface MobileDeviceInfo {
    type: 'phone' | 'tablet';
    manufacturer?: string;
    model?: string;
    brand?: string;
    os: {
        name: 'iOS' | 'Android';
        version: string;
        apiLevel?: number;
    };
    screen: {
        width: number;
        height: number;
        density: number;
        orientation: 'portrait' | 'landscape';
    };
    memory?: {
        total: number;
        available: number;
    };
    storage?: {
        total: number;
        available: number;
    };
    battery?: {
        level: number;
        charging: boolean;
    };
    network?: {
        type: 'wifi' | 'cellular' | 'none' | 'unknown';
        effectiveType?: '2g' | '3g' | '4g' | '5g';
        carrier?: string;
    };
    isEmulator?: boolean;
    isRooted?: boolean;
    isJailbroken?: boolean;
}
export interface AppInfo {
    name: string;
    version: string;
    build: string;
    bundleId: string;
    installSource?: 'app_store' | 'play_store' | 'testflight' | 'sideload' | 'unknown';
}
export interface LocationInfo {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
}
export interface MobilePerformanceMetrics {
    appStartTime?: number;
    warmStartTime?: number;
    screenRenderTime?: number;
    timeToInteractive?: number;
    frameRate?: number;
    droppedFrames?: number;
    memoryUsage?: number;
    cpuUsage?: number;
}
export interface NetworkRequest {
    sessionId?: string;
    url: string;
    method: string;
    statusCode?: number;
    durationMs: number;
    requestSize?: number;
    responseSize?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    errorMessage?: string;
    timestamp: string;
    initiator?: 'fetch' | 'axios' | 'xhr' | 'native';
}
export interface CrashData {
    message: string;
    stack?: string;
    type: 'javascript' | 'native' | 'anr' | 'oom';
    timestamp: string;
    sessionId: string;
    userId?: string;
    screenName?: string;
    breadcrumbs?: Breadcrumb[];
    context?: Record<string, any>;
    device?: MobileDeviceInfo;
    app?: AppInfo;
    isFatal?: boolean;
    signal?: string;
    nativeStack?: NativeStackFrame[];
    anrDuration?: number;
    mainThreadStack?: string;
}
export interface NativeStackFrame {
    file?: string;
    function?: string;
    line?: number;
    column?: number;
    address?: string;
    symbol?: string;
    image?: string;
}
export interface Breadcrumb {
    category: string;
    message: string;
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
    timestamp: string;
    data?: Record<string, any>;
}
export interface TouchData {
    type: 'tap' | 'longPress' | 'swipe' | 'pinch' | 'scroll';
    x: number;
    y: number;
    relativeX: number;
    relativeY: number;
    screenName: string;
    screenWidth: number;
    screenHeight: number;
    timestamp: string;
    direction?: 'up' | 'down' | 'left' | 'right';
    velocity?: number;
    duration?: number;
    force?: number;
    elementType?: string;
    elementId?: string;
    elementLabel?: string;
}
export interface ScrollData {
    screenName: string;
    scrollDepth: number;
    maxScrollDepth: number;
    contentHeight: number;
    viewportHeight: number;
    direction: 'up' | 'down';
    timestamp: string;
}
export interface ScreenViewData {
    sessionId: string;
    screenName: string;
    screenClass?: string;
    timestamp: string;
    previousScreen?: string;
    renderTime?: number;
    properties?: Record<string, any>;
}
export interface ScreenshotData {
    sessionId: string;
    screenName: string;
    screenshot: string;
    width: number;
    height: number;
    timestamp: string;
}
export interface UserInteraction {
    type: 'tap' | 'long_press' | 'swipe' | 'scroll' | 'input' | 'gesture';
    timestamp: string;
    screenName: string;
    elementType?: string;
    elementId?: string;
    elementLabel?: string;
    value?: string;
    coordinates?: {
        x: number;
        y: number;
    };
}
export interface FlowStep {
    stepName: string;
    screenName: string;
    timestamp: string;
    duration?: number;
    success: boolean;
    errorMessage?: string;
}
export type { DevSkinMobileConfig as MobileConfig, MobileDeviceInfo as DeviceInfo, };
//# sourceMappingURL=types.d.ts.map