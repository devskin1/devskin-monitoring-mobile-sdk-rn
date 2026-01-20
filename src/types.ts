/**
 * DevSkin Mobile SDK Types
 * Mirrors browser SDK types for compatibility
 */

export interface DevSkinMobileConfig {
  apiKey: string;
  appId: string;
  apiUrl?: string;
  debug?: boolean;

  // Session Tracking
  sessionTracking?: {
    enabled?: boolean;
    trackScreenViews?: boolean;
    trackUserInteractions?: boolean;
    sessionTimeout?: number; // in milliseconds
  };

  // Crash Reporting
  crashReporting?: {
    enabled?: boolean;
    captureNativeCrashes?: boolean;
    captureBreadcrumbs?: boolean;
    maxBreadcrumbs?: number;
  };

  // Performance Monitoring
  performance?: {
    enabled?: boolean;
    trackAppStartTime?: boolean;
    trackScreenRenderTime?: boolean;
    trackNetworkRequests?: boolean;
    slowRenderThreshold?: number; // in milliseconds
  };

  // Touch Heatmaps
  heatmapOptions?: {
    enabled?: boolean;
    trackTouches?: boolean;
    trackScrolls?: boolean;
    trackGestures?: boolean;
    touchSampling?: number; // 0-1, default 1 (100%)
  };

  // Screenshot Capture
  screenshotOptions?: {
    enabled?: boolean;
    captureOnScreenChange?: boolean;
    quality?: number; // 0-1, default 0.7
    maxWidth?: number; // default 375
    maxHeight?: number; // default 812
  };

  // Session Recording (for replay)
  recordingOptions?: {
    enabled?: boolean;
    flushInterval?: number; // in milliseconds, default 5000
  };

  // Network Monitoring
  networkOptions?: {
    ignoreUrls?: RegExp[];
    captureHeaders?: boolean;
    captureBody?: boolean;
    captureFailedOnly?: boolean;
  };

  // Analytics
  analytics?: {
    enabled?: boolean;
    trackUserProperties?: boolean;
    autoTrackScreens?: boolean;
  };

  // Privacy
  privacy?: {
    respectDoNotTrack?: boolean;
    maskSensitiveData?: boolean;
    allowedDataTypes?: ('device' | 'location' | 'network' | 'crashes')[];
  };

  // Environment
  environment?: 'development' | 'staging' | 'production';
  release?: string;
  appVersion?: string;

  // Callbacks
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
    apiLevel?: number; // Android only
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
  isRooted?: boolean; // Android
  isJailbroken?: boolean; // iOS
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

// Performance Metrics specific to mobile
export interface MobilePerformanceMetrics {
  appStartTime?: number; // Cold start time in ms
  warmStartTime?: number; // Warm start time in ms
  screenRenderTime?: number;
  timeToInteractive?: number;
  frameRate?: number;
  droppedFrames?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// Network Request
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

// Error/Crash Data
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
  // Native crash specific
  signal?: string; // e.g., SIGSEGV, SIGABRT
  nativeStack?: NativeStackFrame[];
  // ANR specific (Application Not Responding)
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

// Touch Heatmap Data
export interface TouchData {
  type: 'tap' | 'longPress' | 'swipe' | 'pinch' | 'scroll';
  x: number;
  y: number;
  relativeX: number; // Position relative to screen element
  relativeY: number;
  screenName: string;
  screenWidth: number;
  screenHeight: number;
  timestamp: string;
  // Gesture specific
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
  duration?: number;
  force?: number; // 3D Touch / Force Touch
  // Element info
  elementType?: string; // e.g., 'Button', 'Text', 'Image'
  elementId?: string;
  elementLabel?: string;
}

export interface ScrollData {
  screenName: string;
  scrollDepth: number; // 0-100 percentage
  maxScrollDepth: number;
  contentHeight: number;
  viewportHeight: number;
  direction: 'up' | 'down';
  timestamp: string;
}

// Screen View
export interface ScreenViewData {
  sessionId: string;
  screenName: string;
  screenClass?: string;
  timestamp: string;
  previousScreen?: string;
  renderTime?: number;
  properties?: Record<string, any>;
}

// Screenshot Data
export interface ScreenshotData {
  sessionId: string;
  screenName: string;
  screenshot: string; // base64 encoded image
  width: number;
  height: number;
  timestamp: string;
}

// User Interaction
export interface UserInteraction {
  type: 'tap' | 'long_press' | 'swipe' | 'scroll' | 'input' | 'gesture';
  timestamp: string;
  screenName: string;
  elementType?: string;
  elementId?: string;
  elementLabel?: string;
  value?: string; // For input interactions (masked if sensitive)
  coordinates?: {
    x: number;
    y: number;
  };
}

// Funnel/Flow tracking
export interface FlowStep {
  stepName: string;
  screenName: string;
  timestamp: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

// Export all types
export type {
  DevSkinMobileConfig as MobileConfig,
  MobileDeviceInfo as DeviceInfo,
};
