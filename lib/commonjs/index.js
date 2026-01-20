"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  DevSkinMobileSDK: true,
  MobileTransport: true,
  ErrorCollector: true,
  NetworkCollector: true,
  PerformanceCollector: true,
  HeatmapCollector: true,
  DeviceCollector: true,
  RecordingCollector: true
};
exports.DevSkinMobileSDK = void 0;
Object.defineProperty(exports, "DeviceCollector", {
  enumerable: true,
  get: function () {
    return _device.DeviceCollector;
  }
});
Object.defineProperty(exports, "ErrorCollector", {
  enumerable: true,
  get: function () {
    return _error.ErrorCollector;
  }
});
Object.defineProperty(exports, "HeatmapCollector", {
  enumerable: true,
  get: function () {
    return _heatmap.HeatmapCollector;
  }
});
Object.defineProperty(exports, "MobileTransport", {
  enumerable: true,
  get: function () {
    return _transport.MobileTransport;
  }
});
Object.defineProperty(exports, "NetworkCollector", {
  enumerable: true,
  get: function () {
    return _network.NetworkCollector;
  }
});
Object.defineProperty(exports, "PerformanceCollector", {
  enumerable: true,
  get: function () {
    return _performance.PerformanceCollector;
  }
});
Object.defineProperty(exports, "RecordingCollector", {
  enumerable: true,
  get: function () {
    return _recording.RecordingCollector;
  }
});
exports.default = void 0;
var _reactNative = require("react-native");
var _transport = require("./transport");
var _error = require("./collectors/error");
var _network = require("./collectors/network");
var _performance = require("./collectors/performance");
var _heatmap = require("./collectors/heatmap");
var _device = require("./collectors/device");
var _recording = require("./collectors/recording");
var _types = require("./types");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
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

// Re-export types

class DevSkinMobileSDK {
  config = null;
  transport = null;
  sessionId = null;
  userId = null;
  anonymousId = null;
  _sessionStartTime = 0;
  initialized = false;
  initializing = false;
  currentScreen = '';
  userTraits = {};

  // Collectors
  deviceCollector = null;
  errorCollector = null;
  networkCollector = null;
  performanceCollector = null;
  heatmapCollector = null;
  recordingCollector = null;

  // State
  deviceInfo = null;
  appInfo = null;
  appState = 'active';
  isOptedOut = false;

  /**
   * Initialize the DevSkin Mobile SDK
   */
  async init(config) {
    if (this.initialized || this.initializing) {
      console.warn('[DevSkin Mobile] SDK already initialized');
      return;
    }
    this.initializing = true;

    // Merge with default config
    this.config = {
      apiUrl: 'https://api-monitoring.devskin.com',
      environment: 'production',
      debug: false,
      sessionTracking: {
        enabled: true,
        trackScreenViews: true,
        trackUserInteractions: true,
        sessionTimeout: 30 * 60 * 1000 // 30 minutes
      },
      crashReporting: {
        enabled: true,
        captureNativeCrashes: true,
        captureBreadcrumbs: true,
        maxBreadcrumbs: 50
      },
      performance: {
        enabled: true,
        trackAppStartTime: true,
        trackScreenRenderTime: true,
        trackNetworkRequests: true,
        slowRenderThreshold: 500
      },
      heatmapOptions: {
        enabled: true,
        trackTouches: true,
        trackScrolls: true,
        trackGestures: true,
        touchSampling: 1 // 100% of touches
      },
      screenshotOptions: {
        enabled: false,
        // Disabled by default - requires user to enable
        captureOnScreenChange: false,
        quality: 0.7,
        maxWidth: 375,
        maxHeight: 812
      },
      recordingOptions: {
        enabled: true,
        // Enabled by default for session replay
        flushInterval: 5000 // 5 seconds
      },
      analytics: {
        enabled: true,
        trackUserProperties: true,
        autoTrackScreens: true
      },
      ...config
    };
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Initializing SDK with config:', this.config);
    }
    try {
      // Initialize transport
      this.transport = new _transport.MobileTransport(this.config);

      // Generate anonymous ID
      this.anonymousId = this.getOrCreateAnonymousId();

      // Initialize device collector and get device info
      this.deviceCollector = new _device.DeviceCollector(this.config);
      this.deviceInfo = await this.deviceCollector.collect();
      this.appInfo = await this.deviceCollector.collectAppInfo();

      // Generate session
      this.sessionId = this.generateId();
      this._sessionStartTime = Date.now();
      this.transport.setSessionId(this.sessionId);

      // Start session
      await this.startSession();

      // Initialize collectors
      this.initializeCollectors();

      // Setup app state listener
      this.setupAppStateListener();

      // Setup dimension change listener
      this.setupDimensionListener();
      this.initialized = true;
      this.initializing = false;

      // Mark app as ready (for cold start measurement)
      this.performanceCollector?.markAppReady();
      if (this.config.debug) {
        console.log('[DevSkin Mobile] SDK initialized successfully');
        console.log('[DevSkin Mobile] Session ID:', this.sessionId);
      }
    } catch (error) {
      this.initializing = false;
      console.error('[DevSkin Mobile] Failed to initialize SDK:', error);
      throw error;
    }
  }

  /**
   * Track a custom event
   */
  track(eventName, properties) {
    if (!this.isReady()) return;
    const eventData = {
      eventName,
      eventType: 'track',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      anonymousId: this.anonymousId,
      properties: {
        ...properties,
        screenName: this.currentScreen
      },
      screenName: this.currentScreen
    };
    this.transport.sendEvent(eventData);
    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Event tracked:', eventName, properties);
    }
  }

  /**
   * Track a screen view
   */
  trackScreen(screenName, properties) {
    if (!this.isReady()) return;
    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    // Update collectors with current screen
    this.errorCollector?.setCurrentScreen(screenName);
    this.heatmapCollector?.setCurrentScreen(screenName);

    // Record screen change for session replay
    this.recordingCollector?.recordScreenChange(screenName);

    // Start screen render timing
    this.performanceCollector?.startScreenRender(screenName);
    const screenView = {
      sessionId: this.sessionId,
      screenName,
      previousScreen: previousScreen || undefined,
      timestamp: new Date().toISOString(),
      properties
    };
    this.transport.sendScreenView(screenView);

    // Also track as analytics event
    this.track('screen_view', {
      screen_name: screenName,
      previous_screen: previousScreen,
      ...properties
    });
    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Screen tracked:', screenName);
    }
  }

  /**
   * Mark current screen as rendered (for performance timing)
   */
  markScreenRendered(screenName) {
    if (!this.isReady()) return;
    this.performanceCollector?.endScreenRender(screenName || this.currentScreen);
  }

  /**
   * Identify a user
   */
  identify(userId, traits) {
    if (!this.isReady()) return;
    this.userId = userId;
    this.userTraits = {
      ...this.userTraits,
      ...traits
    };

    // Update collectors
    this.errorCollector?.setUserId(userId);
    const userData = {
      userId,
      anonymousId: this.anonymousId,
      traits: this.userTraits,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };
    this.transport.identifyUser(userData);
    if (this.config?.debug) {
      console.log('[DevSkin Mobile] User identified:', userId, traits);
    }
  }

  /**
   * Set user properties without full identification
   */
  setUser(user) {
    if (user.id) {
      this.identify(user.id, user);
    } else {
      this.userTraits = {
        ...this.userTraits,
        ...user
      };
    }
  }

  /**
   * Clear user data (on logout)
   */
  clearUser() {
    this.userId = null;
    this.userTraits = {};
    this.errorCollector?.setUserId(undefined);
    if (this.config?.debug) {
      console.log('[DevSkin Mobile] User cleared');
    }
  }

  /**
   * Capture an error manually
   */
  captureError(error, context) {
    if (!this.isReady()) return;
    this.errorCollector?.captureError(error, context);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb) {
    if (!this.isReady()) return;
    this.errorCollector?.addBreadcrumb(breadcrumb);
  }

  /**
   * Track a touch event (for heatmaps and recording)
   */
  trackTouch(type, x, y, extra) {
    if (!this.isReady()) return;

    // Heatmap tracking
    if (type === 'tap') {
      this.heatmapCollector?.onTouchStart(x, y);
      this.heatmapCollector?.onTouchEnd(x, y);
    }

    // Recording for session replay
    this.recordingCollector?.recordTouch(type, x, y, extra);
  }

  /**
   * Track scroll for heatmaps and recording
   */
  trackScroll(scrollY, contentHeight, viewportHeight) {
    if (!this.isReady()) return;

    // Heatmap tracking
    this.heatmapCollector?.onScroll(scrollY, contentHeight, viewportHeight);

    // Recording for session replay
    const maxScrollY = contentHeight - viewportHeight;
    const scrollDepth = maxScrollY > 0 ? Math.min(100, Math.round(scrollY / maxScrollY * 100)) : 100;
    this.recordingCollector?.recordScroll(scrollY, scrollDepth);
  }

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
  async captureScreenshot(imageUri, options) {
    if (!this.isReady()) return;
    if (!this.config?.screenshotOptions?.enabled) {
      if (this.config?.debug) {
        console.log('[DevSkin Mobile] Screenshot capture is disabled');
      }
      return;
    }
    try {
      // Convert URI to base64 (React Native)
      const RNFS = require('react-native-fs');
      const base64 = await RNFS.readFile(imageUri, 'base64');
      const screenshotData = {
        sessionId: this.sessionId,
        screenName: this.currentScreen || 'Unknown',
        screenshot: `data:image/jpeg;base64,${base64}`,
        width: options?.width || this.config?.screenshotOptions?.maxWidth || 375,
        height: options?.height || this.config?.screenshotOptions?.maxHeight || 812,
        timestamp: new Date().toISOString()
      };
      await this.transport.sendScreenshot(screenshotData);
      if (this.config?.debug) {
        console.log('[DevSkin Mobile] Screenshot captured and sent for:', this.currentScreen);
      }
    } catch (error) {
      if (this.config?.debug) {
        console.error('[DevSkin Mobile] Failed to capture screenshot:', error);
        console.log('[DevSkin Mobile] Make sure react-native-fs is installed: npm install react-native-fs');
      }
    }
  }

  /**
   * Capture screenshot from base64 directly (no file system needed)
   */
  async captureScreenshotFromBase64(base64Image, options) {
    if (!this.isReady()) return;
    if (!this.config?.screenshotOptions?.enabled) {
      if (this.config?.debug) {
        console.log('[DevSkin Mobile] Screenshot capture is disabled');
      }
      return;
    }
    try {
      // Ensure proper base64 format
      const screenshot = base64Image.startsWith('data:image/') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      const screenshotData = {
        sessionId: this.sessionId,
        screenName: this.currentScreen || 'Unknown',
        screenshot,
        width: options?.width || this.config?.screenshotOptions?.maxWidth || 375,
        height: options?.height || this.config?.screenshotOptions?.maxHeight || 812,
        timestamp: new Date().toISOString()
      };
      await this.transport.sendScreenshot(screenshotData);
      if (this.config?.debug) {
        console.log('[DevSkin Mobile] Screenshot sent for:', this.currentScreen);
      }
    } catch (error) {
      if (this.config?.debug) {
        console.error('[DevSkin Mobile] Failed to send screenshot:', error);
      }
    }
  }

  /**
   * Report a custom performance metric
   */
  reportPerformance(name, value, context) {
    if (!this.isReady()) return;
    this.performanceCollector?.reportMetric(name, value, context);
  }

  /**
   * Opt out of all tracking
   */
  optOut() {
    this.isOptedOut = true;
    // Store preference
    // AsyncStorage.setItem('devskin_opt_out', 'true');

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] User opted out');
    }
  }

  /**
   * Opt back into tracking
   */
  optIn() {
    this.isOptedOut = false;
    // AsyncStorage.removeItem('devskin_opt_out');

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] User opted in');
    }
  }

  /**
   * Check if user is opted out
   */
  isUserOptedOut() {
    return this.isOptedOut;
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get anonymous ID
   */
  getAnonymousId() {
    return this.anonymousId;
  }

  /**
   * Manually flush all pending events
   */
  async flush() {
    if (!this.isReady()) return;
    this.heatmapCollector?.flush();
    await this.recordingCollector?.flush();
    await this.transport?.flush();
    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Events flushed');
    }
  }

  /**
   * Destroy the SDK (cleanup)
   */
  destroy() {
    const debug = this.config?.debug;
    this.performanceCollector?.stop();
    this.heatmapCollector?.stop();
    this.recordingCollector?.stop();
    this.transport?.destroy();
    this.initialized = false;
    this.config = null;
    this.transport = null;
    if (debug) {
      console.log('[DevSkin Mobile] SDK destroyed');
    }
  }

  // Private methods
  isReady() {
    if (this.isOptedOut) return false;
    if (!this.initialized || !this.transport) {
      if (this.config?.debug) {
        console.warn('[DevSkin Mobile] SDK not initialized');
      }
      return false;
    }
    return true;
  }
  initializeCollectors() {
    if (!this.config || !this.transport) return;

    // Error collector
    this.errorCollector = new _error.ErrorCollector(this.config, this.transport);
    this.errorCollector.setSessionId(this.sessionId);
    this.errorCollector.setDeviceInfo(this.deviceInfo);
    this.errorCollector.setAppInfo(this.appInfo);
    this.errorCollector.start();

    // Network collector
    this.networkCollector = new _network.NetworkCollector(this.config, this.transport);
    this.networkCollector.setSessionId(this.sessionId);
    this.networkCollector.start();

    // Performance collector
    this.performanceCollector = new _performance.PerformanceCollector(this.config, this.transport);
    this.performanceCollector.setSessionId(this.sessionId);
    this.performanceCollector.start();

    // Heatmap collector
    const {
      width,
      height
    } = _reactNative.Dimensions.get('window');
    this.heatmapCollector = new _heatmap.HeatmapCollector(this.config, this.transport);
    this.heatmapCollector.setSessionId(this.sessionId);
    this.heatmapCollector.setAnonymousId(this.anonymousId);
    this.heatmapCollector.setScreenDimensions(width, height);
    this.heatmapCollector.start();

    // Recording collector (for session replay)
    this.recordingCollector = new _recording.RecordingCollector(this.config, this.transport);
    this.recordingCollector.setSessionId(this.sessionId);
    this.recordingCollector.setScreenDimensions(width, height);
    this.recordingCollector.start();
  }
  async startSession() {
    if (!this.transport || !this.sessionId) return;
    const platform = this.getPlatform();
    const sessionData = {
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      anonymousId: this.anonymousId,
      startedAt: new Date().toISOString(),
      platform,
      device: this.deviceInfo || undefined,
      app: this.appInfo || undefined
    };
    await this.transport.startSession(sessionData);
    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Session started:', this.sessionId);
    }
  }
  getPlatform() {
    // In real implementation, detect if running in Expo, bare RN, etc.
    return 'react-native';
  }
  setupAppStateListener() {
    _reactNative.AppState.addEventListener('change', nextState => {
      const previousState = this.appState;
      this.appState = nextState;
      if (previousState === 'background' && nextState === 'active') {
        // App came to foreground
        this.addBreadcrumb({
          category: 'app.lifecycle',
          message: 'App became active',
          level: 'info'
        });

        // Check if session expired
        // const now = Date.now();
        // const sessionTimeout = this.config?.sessionTracking?.sessionTimeout || 30 * 60 * 1000;
        // if (now - this.sessionStartTime > sessionTimeout) {
        //   // Start new session
        // }
      } else if (nextState === 'background') {
        // App went to background
        this.addBreadcrumb({
          category: 'app.lifecycle',
          message: 'App went to background',
          level: 'info'
        });

        // Flush pending events
        this.flush();
      }
    });
  }
  setupDimensionListener() {
    _reactNative.Dimensions.addEventListener('change', ({
      window
    }) => {
      this.deviceCollector?.updateOrientation();
      this.heatmapCollector?.setScreenDimensions(window.width, window.height);
      this.recordingCollector?.setScreenDimensions(window.width, window.height);
    });
  }
  getOrCreateAnonymousId() {
    // In real implementation, use AsyncStorage
    // let id = await AsyncStorage.getItem('devskin_anonymous_id');
    // if (!id) {
    //   id = this.generateId();
    //   await AsyncStorage.setItem('devskin_anonymous_id', id);
    // }
    // return id;
    return this.generateId();
  }
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }
}

// Export singleton instance
exports.DevSkinMobileSDK = DevSkinMobileSDK;
const DevSkin = new DevSkinMobileSDK();
var _default = exports.default = DevSkin; // Also export class for custom instantiation
// Export collectors for advanced usage
//# sourceMappingURL=index.js.map