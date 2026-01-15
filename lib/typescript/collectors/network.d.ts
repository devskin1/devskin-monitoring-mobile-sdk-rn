/**
 * DevSkin Mobile SDK - Network Collector
 * Intercepts fetch, axios, and XMLHttpRequest calls
 */
import { DevSkinMobileConfig, NetworkRequest } from '../types';
import { MobileTransport } from '../transport';
export declare class NetworkCollector {
    private config;
    private transport;
    private sessionId;
    constructor(config: DevSkinMobileConfig, transport: MobileTransport);
    start(): void;
    setSessionId(sessionId: string): void;
    /**
     * Manually track a network request (for native modules)
     */
    trackRequest(request: Omit<NetworkRequest, 'sessionId' | 'timestamp'>): void;
    private interceptFetch;
    private interceptXHR;
    private shouldIgnoreUrl;
    private sanitizeUrl;
    private getResponseSize;
    private headersToObject;
}
//# sourceMappingURL=network.d.ts.map