/**
 * DevSkin Mobile SDK - Device Collector
 * Collects device information, screen dimensions, OS, etc.
 */

import { DevSkinMobileConfig, MobileDeviceInfo, AppInfo } from '../types';
import { Platform, Dimensions, PixelRatio } from 'react-native';

export class DeviceCollector {
  private deviceInfo: MobileDeviceInfo | null = null;
  private appInfo: AppInfo | null = null;

  constructor(private config: DevSkinMobileConfig) {}

  /**
   * Collect device information
   * Call this during SDK initialization
   */
  async collect(): Promise<MobileDeviceInfo> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    const { width, height } = Dimensions.get('screen');

    this.deviceInfo = {
      type: this.getDeviceType(width, height),
      manufacturer: await this.getManufacturer(),
      model: await this.getModel(),
      brand: await this.getBrand(),
      os: {
        name: Platform.OS === 'ios' ? 'iOS' : 'Android',
        version: Platform.Version?.toString() || 'unknown',
        apiLevel: Platform.OS === 'android' ? (Platform.Version as number) : undefined,
      },
      screen: {
        width,
        height,
        density: PixelRatio.get(),
        orientation: width > height ? 'landscape' : 'portrait',
      },
      network: await this.getNetworkInfo(),
      isEmulator: await this.isEmulator(),
    };

    // Add iOS/Android specific info
    if (Platform.OS === 'ios') {
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
  async collectAppInfo(): Promise<AppInfo> {
    if (this.appInfo) {
      return this.appInfo;
    }

    this.appInfo = {
      name: await this.getAppName(),
      version: await this.getAppVersion(),
      build: await this.getBuildNumber(),
      bundleId: await this.getBundleId(),
      installSource: await this.getInstallSource(),
    };

    if (this.config.debug) {
      console.log('[DevSkin Mobile] App info collected:', this.appInfo);
    }

    return this.appInfo;
  }

  /**
   * Get cached device info
   */
  getDeviceInfo(): MobileDeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Get cached app info
   */
  getAppInfo(): AppInfo | null {
    return this.appInfo;
  }

  /**
   * Update orientation when it changes
   */
  updateOrientation(): void {
    if (this.deviceInfo) {
      const { width, height } = Dimensions.get('screen');
      this.deviceInfo.screen.width = width;
      this.deviceInfo.screen.height = height;
      this.deviceInfo.screen.orientation = width > height ? 'landscape' : 'portrait';
    }
  }

  // Private methods - these would use native modules in real implementation
  private getDeviceType(width: number, height: number): 'phone' | 'tablet' {
    // Simple heuristic - tablets usually have larger screens
    const screenSize = Math.sqrt(width * width + height * height) / PixelRatio.get();
    return screenSize >= 600 ? 'tablet' : 'phone';
  }

  private async getManufacturer(): Promise<string | undefined> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getManufacturer();
    if (Platform.OS === 'ios') {
      return 'Apple';
    }
    return undefined;
  }

  private async getModel(): Promise<string | undefined> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getModel();
    return undefined;
  }

  private async getBrand(): Promise<string | undefined> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getBrand();
    if (Platform.OS === 'ios') {
      return 'Apple';
    }
    return undefined;
  }

  private async getNetworkInfo(): Promise<MobileDeviceInfo['network']> {
    // In real implementation, use @react-native-community/netinfo
    // const netInfo = await NetInfo.fetch();
    // return {
    //   type: netInfo.type,
    //   effectiveType: netInfo.details?.cellularGeneration,
    //   carrier: netInfo.details?.carrier,
    // };
    return {
      type: 'unknown',
    };
  }

  private async isEmulator(): Promise<boolean> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.isEmulator();
    return __DEV__;
  }

  private async isJailbroken(): Promise<boolean | undefined> {
    // In real implementation, use react-native-device-info or jail-monkey
    // return JailMonkey.isJailBroken();
    return undefined;
  }

  private async isRooted(): Promise<boolean | undefined> {
    // In real implementation, use jail-monkey
    // return JailMonkey.isRooted();
    return undefined;
  }

  private async getBatteryInfo(): Promise<MobileDeviceInfo['battery']> {
    // In real implementation, use react-native-device-info
    // return {
    //   level: await DeviceInfo.getBatteryLevel(),
    //   charging: await DeviceInfo.isBatteryCharging(),
    // };
    return undefined;
  }

  private async getMemoryInfo(): Promise<MobileDeviceInfo['memory']> {
    // In real implementation, use react-native-device-info
    // return {
    //   total: await DeviceInfo.getTotalMemory(),
    //   available: await DeviceInfo.getFreeDiskStorage(),
    // };
    return undefined;
  }

  private async getStorageInfo(): Promise<MobileDeviceInfo['storage']> {
    // In real implementation, use react-native-device-info
    // return {
    //   total: await DeviceInfo.getTotalDiskCapacity(),
    //   available: await DeviceInfo.getFreeDiskStorage(),
    // };
    return undefined;
  }

  private async getAppName(): Promise<string> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getApplicationName();
    return this.config.appId;
  }

  private async getAppVersion(): Promise<string> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getVersion();
    return this.config.appVersion || '1.0.0';
  }

  private async getBuildNumber(): Promise<string> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getBuildNumber();
    return '1';
  }

  private async getBundleId(): Promise<string> {
    // In real implementation, use react-native-device-info
    // return DeviceInfo.getBundleId();
    return this.config.appId;
  }

  private async getInstallSource(): Promise<AppInfo['installSource']> {
    // In real implementation, detect based on platform and build type
    if (Platform.OS === 'ios') {
      // Check if TestFlight or App Store
      return __DEV__ ? 'sideload' : 'app_store';
    } else {
      // Check if Play Store or sideload
      return __DEV__ ? 'sideload' : 'play_store';
    }
  }
}
