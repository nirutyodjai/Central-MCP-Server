import { EnhancedFastMCPServer } from '../core/EnhancedFastMCPServer.js';
export declare class ManagementAPI {
  private app;
  private server;
  private port;
  private enhancedServer;
  private monitoring;
  constructor(enhancedServer: EnhancedFastMCPServer, port?: number);
  private setupMiddleware;
  private setupRoutes;
  private setupWebSocket;
  private processOperation;
  start(): Promise<void>;
  stop(): Promise<void>;
  getInfo(): {
    port: number;
    status: string;
    endpoints: string[];
  };
}
//# sourceMappingURL=ManagementAPI.d.ts.map
