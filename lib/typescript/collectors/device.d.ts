/**
 * DevSkin Mobile SDK - Device Collector
 * Collects device information, screen dimensions, OS, etc.
 */
import { DevSkinMobileConfig, MobileDeviceInfo, AppInfo } from '../types';
export declare class DeviceCollector {
    private config;
    private deviceInfo;
    private appInfo;
    constructor(config: DevSkinMobileConfig);
    /**
     * Collect device information
     * Call this during SDK initialization
     */
    collect(): Promise<MobileDeviceInfo>;
    /**
     * Collect app information
     */
    collectAppInfo(): Promise<AppInfo>;
    /**
     * Get cached device info
     */
    getDeviceInfo(): MobileDeviceInfo | null;
    /**
     * Get cached app info
     */
    getAppInfo(): AppInfo | null;
    /**
     * Update orientation when it changes
     */
    updateOrientation(): void;
    private getDeviceType;
    private getManufacturer;
    private getModel;
    private getBrand;
    private getNetworkInfo;
    private isEmulator;
    private isJailbroken;
    private isRooted;
    private getBatteryInfo;
    private getMemoryInfo;
    private getStorageInfo;
    private getAppName;
    private getAppVersion;
    private getBuildNumber;
    private getBundleId;
    private getInstallSource;
}
//# sourceMappingURL=device.d.ts.map