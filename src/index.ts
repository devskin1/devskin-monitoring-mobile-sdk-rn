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

import { AppState, AppStateStatus, Dimensions } from 'react-native';
import {
  DevSkinMobileConfig,
  SessionData,
  EventData,
  UserData,
  MobileDeviceInfo,
  AppInfo,
  Breadcrumb,
  ScreenViewData,
} from './types';
import { MobileTransport } from './transport';
import { ErrorCollector } from './collectors/error';
import { NetworkCollector } from './collectors/network';
import { PerformanceCollector } from './collectors/performance';
import { HeatmapCollector } from './collectors/heatmap';
import { DeviceCollector } from './collectors/device';

// Re-export types
export * from './types';

class DevSkinMobileSDK {
  private config: DevSkinMobileConfig | null = null;
  private transport: MobileTransport | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private anonymousId: string | null = null;
  private _sessionStartTime: number = 0;
  private initialized = false;
  private initializing = false;
  private currentScreen: string = '';
  private userTraits: Record<string, any> = {};

  // Collectors
  private deviceCollector: DeviceCollector | null = null;
  private errorCollector: ErrorCollector | null = null;
  private networkCollector: NetworkCollector | null = null;
  private performanceCollector: PerformanceCollector | null = null;
  private heatmapCollector: HeatmapCollector | null = null;

  // State
  private deviceInfo: MobileDeviceInfo | null = null;
  private appInfo: AppInfo | null = null;
  private appState: AppStateStatus = 'active';
  private isOptedOut = false;

  /**
   * Initialize the DevSkin Mobile SDK
   */
  async init(config: DevSkinMobileConfig): Promise<void> {
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
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
      },
      crashReporting: {
        enabled: true,
        captureNativeCrashes: true,
        captureBreadcrumbs: true,
        maxBreadcrumbs: 50,
      },
      performance: {
        enabled: true,
        trackAppStartTime: true,
        trackScreenRenderTime: true,
        trackNetworkRequests: true,
        slowRenderThreshold: 500,
      },
      heatmapOptions: {
        enabled: true,
        trackTouches: true,
        trackScrolls: true,
        trackGestures: true,
        touchSampling: 1, // 100% of touches
      },
      analytics: {
        enabled: true,
        trackUserProperties: true,
        autoTrackScreens: true,
      },
      ...config,
    };

    if (this.config.debug) {
      console.log('[DevSkin Mobile] Initializing SDK with config:', this.config);
    }

    try {
      // Initialize transport
      this.transport = new MobileTransport(this.config);

      // Generate anonymous ID
      this.anonymousId = this.getOrCreateAnonymousId();

      // Initialize device collector and get device info
      this.deviceCollector = new DeviceCollector(this.config);
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
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.isReady()) return;

    const eventData: EventData = {
      eventName,
      eventType: 'track',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId!,
      userId: this.userId || undefined,
      anonymousId: this.anonymousId!,
      properties: {
        ...properties,
        screenName: this.currentScreen,
      },
      screenName: this.currentScreen,
    };

    this.transport!.sendEvent(eventData);

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Event tracked:', eventName, properties);
    }
  }

  /**
   * Track a screen view
   */
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    if (!this.isReady()) return;

    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    // Update collectors with current screen
    this.errorCollector?.setCurrentScreen(screenName);
    this.heatmapCollector?.setCurrentScreen(screenName);

    // Start screen render timing
    this.performanceCollector?.startScreenRender(screenName);

    const screenView: ScreenViewData = {
      sessionId: this.sessionId!,
      screenName,
      previousScreen: previousScreen || undefined,
      timestamp: new Date().toISOString(),
      properties,
    };

    this.transport!.sendScreenView(screenView);

    // Also track as analytics event
    this.track('screen_view', {
      screen_name: screenName,
      previous_screen: previousScreen,
      ...properties,
    });

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Screen tracked:', screenName);
    }
  }

  /**
   * Mark current screen as rendered (for performance timing)
   */
  markScreenRendered(screenName?: string): void {
    if (!this.isReady()) return;
    this.performanceCollector?.endScreenRender(screenName || this.currentScreen);
  }

  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.isReady()) return;

    this.userId = userId;
    this.userTraits = { ...this.userTraits, ...traits };

    // Update collectors
    this.errorCollector?.setUserId(userId);

    const userData: UserData = {
      userId,
      anonymousId: this.anonymousId!,
      traits: this.userTraits,
      sessionId: this.sessionId!,
      timestamp: new Date().toISOString(),
    };

    this.transport!.identifyUser(userData);

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] User identified:', userId, traits);
    }
  }

  /**
   * Set user properties without full identification
   */
  setUser(user: { id?: string } & Record<string, any>): void {
    if (user.id) {
      this.identify(user.id, user);
    } else {
      this.userTraits = { ...this.userTraits, ...user };
    }
  }

  /**
   * Clear user data (on logout)
   */
  clearUser(): void {
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
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.isReady()) return;
    this.errorCollector?.captureError(error, context);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isReady()) return;
    this.errorCollector?.addBreadcrumb(breadcrumb);
  }

  /**
   * Track a touch event (for heatmaps)
   */
  trackTouch(type: 'tap' | 'longPress' | 'swipe', x: number, y: number, _extra?: Record<string, any>): void {
    if (!this.isReady()) return;

    if (type === 'tap') {
      this.heatmapCollector?.onTouchStart(x, y);
      this.heatmapCollector?.onTouchEnd(x, y);
    }
  }

  /**
   * Track scroll for heatmaps
   */
  trackScroll(scrollY: number, contentHeight: number, viewportHeight: number): void {
    if (!this.isReady()) return;
    this.heatmapCollector?.onScroll(scrollY, contentHeight, viewportHeight);
  }

  /**
   * Report a custom performance metric
   */
  reportPerformance(name: string, value: number, context?: Record<string, any>): void {
    if (!this.isReady()) return;
    this.performanceCollector?.reportMetric(name, value, context);
  }

  /**
   * Opt out of all tracking
   */
  optOut(): void {
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
  optIn(): void {
    this.isOptedOut = false;
    // AsyncStorage.removeItem('devskin_opt_out');

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] User opted in');
    }
  }

  /**
   * Check if user is opted out
   */
  isUserOptedOut(): boolean {
    return this.isOptedOut;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get anonymous ID
   */
  getAnonymousId(): string | null {
    return this.anonymousId;
  }

  /**
   * Manually flush all pending events
   */
  async flush(): Promise<void> {
    if (!this.isReady()) return;

    this.heatmapCollector?.flush();
    await this.transport?.flush();

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Events flushed');
    }
  }

  /**
   * Destroy the SDK (cleanup)
   */
  destroy(): void {
    const debug = this.config?.debug;

    this.performanceCollector?.stop();
    this.heatmapCollector?.stop();
    this.transport?.destroy();

    this.initialized = false;
    this.config = null;
    this.transport = null;

    if (debug) {
      console.log('[DevSkin Mobile] SDK destroyed');
    }
  }

  // Private methods
  private isReady(): boolean {
    if (this.isOptedOut) return false;
    if (!this.initialized || !this.transport) {
      if (this.config?.debug) {
        console.warn('[DevSkin Mobile] SDK not initialized');
      }
      return false;
    }
    return true;
  }

  private initializeCollectors(): void {
    if (!this.config || !this.transport) return;

    // Error collector
    this.errorCollector = new ErrorCollector(this.config, this.transport);
    this.errorCollector.setSessionId(this.sessionId!);
    this.errorCollector.setDeviceInfo(this.deviceInfo!);
    this.errorCollector.setAppInfo(this.appInfo!);
    this.errorCollector.start();

    // Network collector
    this.networkCollector = new NetworkCollector(this.config, this.transport);
    this.networkCollector.setSessionId(this.sessionId!);
    this.networkCollector.start();

    // Performance collector
    this.performanceCollector = new PerformanceCollector(this.config, this.transport);
    this.performanceCollector.setSessionId(this.sessionId!);
    this.performanceCollector.start();

    // Heatmap collector
    const { width, height } = Dimensions.get('window');
    this.heatmapCollector = new HeatmapCollector(this.config, this.transport);
    this.heatmapCollector.setSessionId(this.sessionId!);
    this.heatmapCollector.setAnonymousId(this.anonymousId!);
    this.heatmapCollector.setScreenDimensions(width, height);
    this.heatmapCollector.start();
  }

  private async startSession(): Promise<void> {
    if (!this.transport || !this.sessionId) return;

    const platform = this.getPlatform();

    const sessionData: SessionData = {
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      anonymousId: this.anonymousId!,
      startedAt: new Date().toISOString(),
      platform,
      device: this.deviceInfo || undefined,
      app: this.appInfo || undefined,
    };

    await this.transport.startSession(sessionData);

    if (this.config?.debug) {
      console.log('[DevSkin Mobile] Session started:', this.sessionId);
    }
  }

  private getPlatform(): SessionData['platform'] {
    // In real implementation, detect if running in Expo, bare RN, etc.
    return 'react-native';
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const previousState = this.appState;
      this.appState = nextState;

      if (previousState === 'background' && nextState === 'active') {
        // App came to foreground
        this.addBreadcrumb({
          category: 'app.lifecycle',
          message: 'App became active',
          level: 'info',
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
          level: 'info',
        });

        // Flush pending events
        this.flush();
      }
    });
  }

  private setupDimensionListener(): void {
    Dimensions.addEventListener('change', ({ window }) => {
      this.deviceCollector?.updateOrientation();
      this.heatmapCollector?.setScreenDimensions(window.width, window.height);
    });
  }

  private getOrCreateAnonymousId(): string {
    // In real implementation, use AsyncStorage
    // let id = await AsyncStorage.getItem('devskin_anonymous_id');
    // if (!id) {
    //   id = this.generateId();
    //   await AsyncStorage.setItem('devskin_anonymous_id', id);
    // }
    // return id;
    return this.generateId();
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Export singleton instance
const DevSkin = new DevSkinMobileSDK();
export default DevSkin;

// Also export class for custom instantiation
export { DevSkinMobileSDK };

// Export collectors for advanced usage
export { ErrorCollector } from './collectors/error';
export { NetworkCollector } from './collectors/network';
export { PerformanceCollector } from './collectors/performance';
export { HeatmapCollector } from './collectors/heatmap';
export { DeviceCollector } from './collectors/device';
export { MobileTransport } from './transport';
