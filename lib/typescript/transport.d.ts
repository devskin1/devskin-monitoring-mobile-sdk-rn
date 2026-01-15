/**
 * DevSkin Mobile SDK Transport Layer
 * Handles all communication with the backend
 * Uses same endpoints as browser SDK for compatibility
 */
import { DevSkinMobileConfig, EventData, UserData, SessionData, NetworkRequest, CrashData, TouchData, ScrollData, ScreenViewData } from './types';
export declare class MobileTransport {
    private config;
    private queue;
    private flushInterval;
    private readonly maxQueueSize;
    private readonly flushIntervalMs;
    private readonly maxRetries;
    private readonly apiUrl;
    private sessionId;
    private _isOnline;
    private _offlineQueue;
    constructor(config: DevSkinMobileConfig);
    setSessionId(sessionId: string): void;
    startSession(session: SessionData): Promise<void>;
    updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;
    sendEvent(event: EventData): void;
    sendEventBatch(events: EventData[]): Promise<void>;
    identifyUser(user: UserData): Promise<void>;
    sendScreenView(screenView: ScreenViewData): void;
    sendError(error: CrashData): void;
    sendNetworkRequest(request: NetworkRequest): void;
    sendPerformanceMetric(metric: any): void;
    sendTouchData(touch: TouchData): void;
    sendScrollData(scroll: ScrollData): void;
    flush(): Promise<void>;
    destroy(): void;
    private enqueue;
    private startPeriodicFlush;
    private setupNetworkListener;
    private getEndpointForType;
    private sendToBackend;
}
//# sourceMappingURL=transport.d.ts.map