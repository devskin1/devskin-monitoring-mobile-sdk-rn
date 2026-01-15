/**
 * DevSkin Mobile SDK - Error/Crash Collector
 * Captures JavaScript errors, native crashes, ANRs, and OOMs
 */

export class ErrorCollector {
  breadcrumbs = [];
  sessionId = '';
  currentScreen = '';
  constructor(config, transport) {
    this.config = config;
    this.transport = transport;
    this.maxBreadcrumbs = config.crashReporting?.maxBreadcrumbs || 50;
  }
  start() {
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
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
  setUserId(userId) {
    this.userId = userId;
  }
  setCurrentScreen(screenName) {
    this.currentScreen = screenName;
  }
  setDeviceInfo(deviceInfo) {
    this.deviceInfo = deviceInfo;
  }
  setAppInfo(appInfo) {
    this.appInfo = appInfo;
  }

  /**
   * Manually capture an error
   */
  captureError(error, context, isFatal = false) {
    const crashData = this.buildCrashData(error, context, isFatal, 'javascript');
    this.transport.sendError(crashData);

    // Add breadcrumb for this error
    this.addBreadcrumb({
      category: 'error',
      message: crashData.message,
      level: isFatal ? 'fatal' : 'error',
      data: {
        type: crashData.type,
        stack: crashData.stack?.substring(0, 500)
      }
    });
  }

  /**
   * Capture a native crash (called from native module)
   */
  captureNativeCrash(message, nativeStack, signal, context) {
    const crashData = {
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
      signal
    };

    // Send immediately for native crashes
    this.transport.sendError(crashData);
  }

  /**
   * Capture ANR (Application Not Responding) - Android
   */
  captureANR(duration, mainThreadStack) {
    const crashData = {
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
      mainThreadStack
    };
    this.transport.sendError(crashData);
  }

  /**
   * Capture OOM (Out of Memory)
   */
  captureOOM(memoryInfo) {
    const crashData = {
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
      context: {
        memoryInfo
      }
    };
    this.transport.sendError(crashData);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb) {
    if (!this.config.crashReporting?.captureBreadcrumbs) return;
    const crumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString()
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
  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs() {
    this.breadcrumbs = [];
  }

  // Private methods
  setupJSErrorHandler() {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.captureError(error, {
        source: 'globalHandler'
      }, isFatal ?? false);

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
  setupPromiseRejectionHandler() {
    // React Native doesn't have unhandledrejection by default
    // We need to use a polyfill or native module
    // This is a simplified version
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (id, error) => {
        this.captureError(error, {
          source: 'unhandledRejection',
          promiseId: id
        });
      },
      onHandled: () => {
        // Promise was handled later, we can ignore
      }
    });
  }
  setupAutomaticBreadcrumbs() {
    // Console breadcrumbs
    this.wrapConsole();
  }
  wrapConsole() {
    const levels = ['warn', 'error'];
    levels.forEach(level => {
      const original = console[level];
      console[level] = (...args) => {
        // Call original
        original.apply(console, args);

        // Add breadcrumb
        const message = args.map(arg => {
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
          level: level === 'warn' ? 'warning' : 'error'
        });
      };
    });
  }
  buildCrashData(error, context, isFatal = false, type = 'javascript') {
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
        isFatal
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
      isFatal
    };
  }
}
//# sourceMappingURL=error.js.map