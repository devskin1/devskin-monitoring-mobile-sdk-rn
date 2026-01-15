/**
 * DevSkin Mobile SDK - Error/Crash Collector
 * Captures JavaScript errors, native crashes, ANRs, and OOMs
 */

import { DevSkinMobileConfig, CrashData, Breadcrumb, MobileDeviceInfo, AppInfo } from '../types';
import { MobileTransport } from '../transport';

export class ErrorCollector {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;
  private sessionId: string = '';
  private userId?: string;
  private currentScreen: string = '';
  private deviceInfo?: MobileDeviceInfo;
  private appInfo?: AppInfo;

  constructor(
    private config: DevSkinMobileConfig,
    private transport: MobileTransport
  ) {
    this.maxBreadcrumbs = config.crashReporting?.maxBreadcrumbs || 50;
  }

  start(): void {
    if (!this.config.crashReporting?.enabled) return;

    // Capture unhandled JavaScript errors
    this.setupJSErrorHandler();

    // Capture unhandled promise rejections
    this.setupPromiseRejectionHandler();

    // Setup automatic breadcrumbs
    this.setupAutomaticBreadcrumbs();

    if (this.config.debug) {
      console.log('[DevSkin Mobile] Error collector started');
    }
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  setCurrentScreen(screenName: string): void {
    this.currentScreen = screenName;
  }

  setDeviceInfo(deviceInfo: MobileDeviceInfo): void {
    this.deviceInfo = deviceInfo;
  }

  setAppInfo(appInfo: AppInfo): void {
    this.appInfo = appInfo;
  }

  /**
   * Manually capture an error
   */
  captureError(
    error: Error | string,
    context?: Record<string, any>,
    isFatal: boolean = false
  ): void {
    const crashData = this.buildCrashData(error, context, isFatal, 'javascript');
    this.transport.sendError(crashData);

    // Add breadcrumb for this error
    this.addBreadcrumb({
      category: 'error',
      message: crashData.message,
      level: isFatal ? 'fatal' : 'error',
      data: {
        type: crashData.type,
        stack: crashData.stack?.substring(0, 500),
      },
    });
  }

  /**
   * Capture a native crash (called from native module)
   */
  captureNativeCrash(
    message: string,
    nativeStack: string,
    signal?: string,
    context?: Record<string, any>
  ): void {
    const crashData: CrashData = {
      message,
      stack: nativeStack,
      type: 'native',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      screenName: this.currentScreen,
      breadcrumbs: [...this.breadcrumbs],
      context,
      device: this.deviceInfo,
      app: this.appInfo,
      isFatal: true,
      signal,
    };

    // Send immediately for native crashes
    this.transport.sendError(crashData);
  }

  /**
   * Capture ANR (Application Not Responding) - Android
   */
  captureANR(duration: number, mainThreadStack: string): void {
    const crashData: CrashData = {
      message: `Application Not Responding for ${duration}ms`,
      stack: mainThreadStack,
      type: 'anr',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      screenName: this.currentScreen,
      breadcrumbs: [...this.breadcrumbs],
      device: this.deviceInfo,
      app: this.appInfo,
      isFatal: false,
      anrDuration: duration,
      mainThreadStack,
    };

    this.transport.sendError(crashData);
  }

  /**
   * Capture OOM (Out of Memory)
   */
  captureOOM(memoryInfo?: { used: number; available: number; total: number }): void {
    const crashData: CrashData = {
      message: 'Out of Memory',
      type: 'oom',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      screenName: this.currentScreen,
      breadcrumbs: [...this.breadcrumbs],
      device: this.deviceInfo,
      app: this.appInfo,
      isFatal: true,
      context: { memoryInfo },
    };

    this.transport.sendError(crashData);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.config.crashReporting?.captureBreadcrumbs) return;

    const crumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(crumb);

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (this.config.debug) {
      console.log('[DevSkin Mobile] Breadcrumb added:', crumb.message);
    }
  }

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  // Private methods
  private setupJSErrorHandler(): void {
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.captureError(error, { source: 'globalHandler' }, isFatal ?? false);

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  private setupPromiseRejectionHandler(): void {
    // React Native doesn't have unhandledrejection by default
    // We need to use a polyfill or native module
    // This is a simplified version
    const tracking = require('promise/setimmediate/rejection-tracking');

    tracking.enable({
      allRejections: true,
      onUnhandled: (id: number, error: Error) => {
        this.captureError(error, {
          source: 'unhandledRejection',
          promiseId: id,
        });
      },
      onHandled: () => {
        // Promise was handled later, we can ignore
      },
    });
  }

  private setupAutomaticBreadcrumbs(): void {
    // Console breadcrumbs
    this.wrapConsole();
  }

  private wrapConsole(): void {
    const levels: Array<'warn' | 'error'> = ['warn', 'error'];

    levels.forEach((level) => {
      const original = console[level];
      console[level] = (...args: any[]) => {
        // Call original
        original.apply(console, args);

        // Add breadcrumb
        const message = args.map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');

        // Skip DevSkin internal messages
        if (message.startsWith('[DevSkin')) return;

        this.addBreadcrumb({
          category: 'console',
          message: message.substring(0, 500),
          level: level === 'warn' ? 'warning' : 'error',
        });
      };
    });
  }

  private buildCrashData(
    error: Error | string,
    context?: Record<string, any>,
    isFatal: boolean = false,
    type: CrashData['type'] = 'javascript'
  ): CrashData {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        type,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        userId: this.userId,
        screenName: this.currentScreen,
        breadcrumbs: [...this.breadcrumbs],
        context,
        device: this.deviceInfo,
        app: this.appInfo,
        isFatal,
      };
    }

    return {
      message: String(error),
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      screenName: this.currentScreen,
      breadcrumbs: [...this.breadcrumbs],
      context,
      device: this.deviceInfo,
      app: this.appInfo,
      isFatal,
    };
  }
}
