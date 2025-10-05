export declare class WebSocketManager {
  private port;
  private wss;
  private clients;
  private heartbeatInterval;
  constructor(port?: number);
  start(server?: any): Promise<void>;
  private setupClientHandlers;
  private handleClientMessage;
  private handleSubscription;
  private handleUnsubscription;
  private handleRequest;
  private executeToolForClient;
  private sendToClient;
  broadcast(data: any): void;
  broadcastToChannel(channel: string, data: any): void;
  private startHeartbeat;
  private getServerStats;
  stop(): Promise<void>;
  getInfo(): {
    port: number;
    connectedClients: number;
    status: string;
    supportedChannels: string[];
  };
}
export declare class PluginSystem {
  private plugins;
  private hooks;
  register(plugin: Plugin): boolean;
  unregister(pluginName: string): boolean;
  private registerHook;
  private unregisterHook;
  executeHook(hookName: string, ...args: any[]): Promise<any[]>;
  getPlugins(): PluginInfo[];
  setPluginState(pluginName: string, enabled: boolean): boolean;
}
export interface Plugin {
  name: string;
  version: string;
  description?: string;
  enabled?: boolean;
  initialize: (pluginSystem: PluginSystem) => void;
  cleanup?: () => void;
  hooks?: Record<string, Function>;
}
export interface PluginInfo {
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  hooks: string[];
}
export declare class SecurityManager {
  private rateLimiter;
  private blockedIPs;
  private securityRules;
  checkRateLimit(clientId: string, action: string): boolean;
  blockIP(ip: string, reason: string): void;
  isIPBlocked(ip: string): boolean;
  addSecurityRule(rule: SecurityRule): void;
  validateRequest(request: SecurityRequest): SecurityResult;
  private getRateLimitForAction;
  private matchesRule;
  private executeSecurityHooks;
  getSecurityStats(): {
    blockedIPs: number;
    activeRateLimits: number;
    securityRules: number;
    timestamp: number;
  };
}
interface SecurityRule {
  name: string;
  description: string;
  pattern?: string;
  action?: string;
  allow: boolean;
  severity: 'low' | 'medium' | 'high';
}
interface SecurityRequest {
  clientIP: string;
  action: string;
  path: string;
  userAgent?: string;
  timestamp: number;
}
interface SecurityResult {
  allowed: boolean;
  reason?: string;
  rule?: string;
}
export {};
//# sourceMappingURL=AdvancedSystems.d.ts.map
