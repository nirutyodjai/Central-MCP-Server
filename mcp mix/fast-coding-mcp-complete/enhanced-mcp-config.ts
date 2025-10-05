/**
 * Enhanced Central MCP Configuration System
 * รวม central-mcp-config.json เข้ากับ MCP Platform
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MCPServerInfo {
  id: string;
  name: string;
  url: string;
  description: string;
  capabilities: string[];
  source: string;
}

export interface MCPServerRegistry {
  [key: string]: MCPServerInfo;
}

export interface MCPPlatformConfig {
  // Server Configuration
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
    cors: {
      enabled: boolean;
      origins: string[];
      credentials: boolean;
    };
  };

  // MCP Servers Configuration รวมจาก central-mcp-config.json
  mcpServers: {
    [key: string]: {
      enabled: boolean;
      info?: MCPServerInfo;
      config?: any;
    };
  };

  // Database Configuration
  database: {
    type: 'sqlite' | 'postgresql' | 'mysql';
    connection: {
      host?: string;
      port?: number;
      database?: string;
      username?: string;
      password?: string;
      ssl?: boolean;
    };
    logging: {
      enabled: boolean;
      level: 'error' | 'warn' | 'info' | 'debug';
      maxEntries: number;
    };
  };

  // Logging Configuration
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    outputs: {
      console: boolean;
      file: boolean;
      database: boolean;
    };
    file?: {
      path: string;
      maxSize: string;
      maxFiles: number;
    };
  };

  // Cache Configuration
  cache: {
    enabled: boolean;
    defaultTTL: number;
    maxSize: number;
  };
}

export class CentralMCPConfig {
  private platformConfig: MCPPlatformConfig;
  private serverRegistry: MCPServerRegistry;
  private configPath: string;
  private registryPath: string;
  private isLoaded: boolean = false;

  constructor(configPath?: string, registryPath?: string) {
    this.configPath = configPath || './config/mcp-platform-config.json';
    this.registryPath = registryPath || '../central-mcp-config.json';
  }

  /**
   * โหลด configurations ทั้งหมด
   */
  async load(): Promise<void> {
    try {
      console.log('🔄 กำลังโหลด Central MCP Configurations...');

      // โหลด MCP Server Registry จากไฟล์ที่มีอยู่
      await this.loadServerRegistry();

      // สร้างหรือโหลด Platform Configuration
      await this.loadPlatformConfig();

      this.isLoaded = true;
      console.log('✅ โหลด Central MCP Configurations สำเร็จ');

    } catch (error) {
      console.error('❌ ไม่สามารถโหลด configurations:', error);
      throw error;
    }
  }

  /**
   * โหลด MCP Server Registry จาก central-mcp-config.json
   */
  private async loadServerRegistry(): Promise<void> {
    try {
      const registryPath = path.resolve(this.registryPath);
      if (!fs.existsSync(registryPath)) {
        throw new Error(`ไม่พบไฟล์ registry: ${registryPath}`);
      }

      const registryData = fs.readFileSync(registryPath, 'utf-8');
      this.serverRegistry = JSON.parse(registryData);

      console.log(`📋 โหลด MCP Server Registry สำเร็จ (${Object.keys(this.serverRegistry).length} servers)`);

    } catch (error) {
      console.error('❌ ไม่สามารถโหลด MCP Server Registry:', error);
      throw error;
    }
  }

  /**
   * โหลดหรือสร้าง Platform Configuration
   */
  private async loadPlatformConfig(): Promise<void> {
    const configPath = path.resolve(this.configPath);

    if (fs.existsSync(configPath)) {
      // โหลด config ที่มีอยู่
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.platformConfig = JSON.parse(configData);
      console.log('📋 โหลด Platform Configuration ที่มีอยู่');
    } else {
      // สร้าง config เริ่มต้นและรวมกับ server registry
      this.platformConfig = this.createDefaultPlatformConfig();
      console.log('📋 สร้าง Platform Configuration เริ่มต้น');
    }

    // รวม server registry เข้ากับ platform config
    this.integrateServerRegistry();
  }

  /**
   * รวม Server Registry เข้ากับ Platform Config
   */
  private integrateServerRegistry(): void {
    // รวม servers จาก registry เข้ากับ mcpServers config
    for (const [serverId, serverInfo] of Object.entries(this.serverRegistry)) {
      if (!this.platformConfig.mcpServers[serverId]) {
        this.platformConfig.mcpServers[serverId] = {
          enabled: false, // ปิดใช้งานเริ่มต้น
          info: serverInfo
        };
      }
    }

    console.log(`🔗 รวม ${Object.keys(this.serverRegistry).length} MCP servers เข้ากับ platform config`);
  }

  /**
   * สร้าง Platform Configuration เริ่มต้น
   */
  private createDefaultPlatformConfig(): MCPPlatformConfig {
    return {
      server: {
        port: 4523,
        host: 'localhost',
        environment: 'development',
        cors: {
          enabled: true,
          origins: ['http://localhost:3000', 'http://localhost:3001'],
          credentials: true
        }
      },
      mcpServers: {},
      database: {
        type: 'sqlite',
        connection: {},
        logging: {
          enabled: true,
          level: 'info',
          maxEntries: 10000
        }
      },
      logging: {
        level: 'info',
        format: 'json',
        outputs: {
          console: true,
          file: true,
          database: true
        },
        file: {
          path: './logs/mcp-platform.log',
          maxSize: '10m',
          maxFiles: 5
        }
      },
      cache: {
        enabled: true,
        defaultTTL: 300000, // 5 minutes
        maxSize: 1000
      }
    };
  }

  /**
   * บันทึก configurations
   */
  async save(): Promise<void> {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }

    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // บันทึก platform config
      fs.writeFileSync(this.configPath, JSON.stringify(this.platformConfig, null, 2));

      console.log('💾 บันทึก configurations สำเร็จ');

    } catch (error) {
      console.error('❌ ไม่สามารถบันทึก configurations:', error);
      throw error;
    }
  }

  /**
   * ดึง Platform Configuration
   */
  getConfig(): MCPPlatformConfig {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }
    return { ...this.platformConfig };
  }

  /**
   * ดึง MCP Server Registry
   */
  getServerRegistry(): MCPServerRegistry {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }
    return { ...this.serverRegistry };
  }

  /**
   * ดึงข้อมูล MCP Server เฉพาะตัว
   */
  getMCPServerInfo(serverId: string): MCPServerInfo | null {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }
    return this.serverRegistry[serverId] || null;
  }

  /**
   * เปิดใช้งาน MCP Server
   */
  enableMCPServer(serverId: string): void {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }

    if (this.platformConfig.mcpServers[serverId]) {
      this.platformConfig.mcpServers[serverId].enabled = true;
      console.log(`✅ เปิดใช้งาน MCP Server: ${serverId}`);
    }
  }

  /**
   * ปิดใช้งาน MCP Server
   */
  disableMCPServer(serverId: string): void {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }

    if (this.platformConfig.mcpServers[serverId]) {
      this.platformConfig.mcpServers[serverId].enabled = false;
      console.log(`❌ ปิดใช้งาน MCP Server: ${serverId}`);
    }
  }

  /**
   * ดึงรายชื่อ MCP Servers ที่เปิดใช้งาน
   */
  getEnabledMCPServers(): MCPServerInfo[] {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }

    const enabledServers: MCPServerInfo[] = [];

    for (const [serverId, serverConfig] of Object.entries(this.platformConfig.mcpServers)) {
      if (serverConfig.enabled && serverConfig.info) {
        enabledServers.push(serverConfig.info);
      }
    }

    return enabledServers;
  }

  /**
   * ดึงสถิติ configurations
   */
  getStats(): any {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }

    const totalServers = Object.keys(this.serverRegistry).length;
    const enabledServers = Object.values(this.platformConfig.mcpServers).filter(s => s.enabled).length;
    const serversByCapability = this.getServersByCapability();

    return {
      totalServers,
      enabledServers,
      disabledServers: totalServers - enabledServers,
      serversByCapability,
      environment: this.platformConfig.server.environment,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * จัดกลุ่ม servers ตาม capabilities
   */
  private getServersByCapability(): Record<string, number> {
    const capabilityCount: Record<string, number> = {};

    for (const serverInfo of Object.values(this.serverRegistry)) {
      for (const capability of serverInfo.capabilities) {
        capabilityCount[capability] = (capabilityCount[capability] || 0) + 1;
      }
    }

    return capabilityCount;
  }

  /**
   * ค้นหา MCP Servers ตาม capabilities
   */
  findServersByCapability(capability: string): MCPServerInfo[] {
    if (!this.isLoaded) {
      throw new Error('Configurations ยังไม่ได้โหลด');
    }

    return Object.values(this.serverRegistry).filter(server =>
      server.capabilities.includes(capability)
    );
  }

  /**
   * ตรวจสอบความถูกต้องของ configurations
   */
  validate(): { isValid: boolean; errors: string[] } {
    if (!this.isLoaded) {
      return { isValid: false, errors: ['Configurations ยังไม่ได้โหลด'] };
    }

    const errors: string[] = [];

    // ตรวจสอบ server config
    if (!this.platformConfig.server.port || this.platformConfig.server.port <= 0) {
      errors.push('Server port ไม่ถูกต้อง');
    }

    if (!this.platformConfig.server.host) {
      errors.push('Server host ไม่ถูกต้อง');
    }

    // ตรวจสอบ database config
    if (!this.platformConfig.database.type) {
      errors.push('Database type ไม่ถูกต้อง');
    }

    // ตรวจสอบ enabled servers มีข้อมูลครบถ้วน
    for (const [serverId, serverConfig] of Object.entries(this.platformConfig.mcpServers)) {
      if (serverConfig.enabled && !serverConfig.info) {
        errors.push(`MCP Server ${serverId} เปิดใช้งานแต่ไม่มีข้อมูล`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
