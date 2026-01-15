"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DeviceCollector = void 0;
var _reactNative = require("react-native");
/**
 * DevSkin Mobile SDK - Device Collector
 * Collects device information, screen dimensions, OS, etc.
 */

class DeviceCollector {
  deviceInfo = null;
  appInfo = null;
  constructor(config) {
    this.config = config;
  }

  /**
   * Collect device information
   * Call this during SDK initialization
   */
  async collect() {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }
    const {
      width,
      height
    } = _reactNative.Dimensions.get('screen');
    this.deviceInfo = {
      type: this.getDeviceType(width, height),
      manufacturer: await this.getManufacturer(),
      model: await this.getModel(),
      brand: await this.getBrand(),
      os: {
        name: _reactNative.Platform.OS === 'ios' ? 'iOS' : 'Android',
        version: _reactNative.Platform.Version?.toString() || 'unknown',
        apiLevel: _reactNative.Platform.OS === 'android' ? _reactNative.Platform.Version : undefined
      },
      screen: {
        width,
        height,
        density: _reactNative.PixelRatio.get(),
        orientation: width > height ? 'landscape' : 'portrait'
      },
      network: await this.getNetworkInfo(),
      isEmulator: await this.isEmulator()
    };

    // Add iOS/Android specific info
    if (_reactNative.Platform.OS === 'ios') {
      this.deviceInfo.isJailbroken = await this.isJailbroken();
    } else {
      this.deviceInfo.isRooted = await this.isRooted();
    }

    // Try to get battery and memory info
    this.deviceInfo.battery = await this.getBatteryInfo();
    this.deviceInfo.memory = await this.getMemoryInfo();
    this.deviceInfo.storage = await this.getStorageInfo();
    if (this.config.debug) {
      console.log('[DevSkin Mobile] Device info collected:', this.deviceInfo);
    }
    return this.deviceInfo;
  }

  /**
   * Collect app information
   */
  async collectAppInfo() {
    if (this.appInfo) {
      return this.appInfo;
    }
    this.appInfo = {
      name: await this.getAppName(),
      version: await this.getAppVersion(),
      build: await this.getBuildNumber(),
      bundleId: await this.getBundleId(),
      installSource: await this.getInstallSource()
    };
    if (this.config.debug) {
      console.log('[DevSkin Mobile] App info collected:', this.appInfo);
    }
    return this.appInfo;
  }

  /**
   * Get cached device info
   */
  getDeviceInfo() {
    return this.deviceInfo;
  }

  /**
   * Get cached app info
   */
  getAppInfo() {
    return this.appInfo;
  }

  /**
   * Update orientation when it changes
   */
  updateOrientation() {
    if (this.deviceInfo) {
      const {
        width,
        height
      } = _reactNative.Dimensions.get('screen');
      this.deviceInfo.screen.width = width;
      this.deviceInfo.screen.height = height;
      this.deviceInfo.screen.orientation = width > height ? 'landscape' : 'portrait';
    }
  }

  // Private methods - these would use native modules in real implementation
  getDeviceType(width, height) {
    // Simple heuristic - tablets usually have larger screens
    const screenSize = Math.sqrt(width * width + height * height) / _reactNative.PixelRatio.get();
    return screenSize >= 600 ? 'tablet' : 'phone';
  }
  async getManufacturer() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getManufacturer();
    if (_reactNative.Platform.OS === 'ios') {
      return 'Apple';
    }
    return undefined;
  }
  async getModel() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getModel();
    return undefined;
  }
  async getBrand() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getBrand();
    if (_reactNative.Platform.OS === 'ios') {
      return 'Apple';
    }
    return undefined;
  }
  async getNetworkInfo() {
    // In real implementation, use @react-native-community/netinfo
    // const netInfo = await NetInfo.fetch();
    // return {
    //   type: netInfo.type,
    //   effectiveType: netInfo.details?.cellularGeneration,
    //   carrier: netInfo.details?.carrier,
    // };
    return {
      type: 'unknown'
    };
  }
  async isEmulator() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.isEmulator();
    return __DEV__;
  }
  async isJailbroken() {
    // In real implementation, use react-native-device-info or jail-monkey
    // return JailMonkey.isJailBroken();
    return undefined;
  }
  async isRooted() {
    // In real implementation, use jail-monkey
    // return JailMonkey.isRooted();
    return undefined;
  }
  async getBatteryInfo() {
    // In real implementation, use react-native-device-info
    // return {
    //   level: await DeviceInfo.getBatteryLevel(),
    //   charging: await DeviceInfo.isBatteryCharging(),
    // };
    return undefined;
  }
  async getMemoryInfo() {
    // In real implementation, use react-native-device-info
    // return {
    //   total: await DeviceInfo.getTotalMemory(),
    //   available: await DeviceInfo.getFreeDiskStorage(),
    // };
    return undefined;
  }
  async getStorageInfo() {
    // In real implementation, use react-native-device-info
    // return {
    //   total: await DeviceInfo.getTotalDiskCapacity(),
    //   available: await DeviceInfo.getFreeDiskStorage(),
    // };
    return undefined;
  }
  async getAppName() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getApplicationName();
    return this.config.appId;
  }
  async getAppVersion() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getVersion();
    return this.config.appVersion || '1.0.0';
  }
  async getBuildNumber() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getBuildNumber();
    return '1';
  }
  async getBundleId() {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getBundleId();
    return this.config.appId;
  }
  async getInstallSource() {
    // In real implementation, detect based on platform and build type
    if (_reactNative.Platform.OS === 'ios') {
      // Check if TestFlight or App Store
      return __DEV__ ? 'sideload' : 'app_store';
    } else {
      // Check if Play Store or sideload
      return __DEV__ ? 'sideload' : 'play_store';
    }
  }
}
exports.DeviceCollector = DeviceCollector;
//# sourceMappingURL=device.js.map