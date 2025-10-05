/**
 * Central MCP Configuration System
 * ระบบจัดการการตั้งค่ากลางสำหรับ MCP Platform
 */

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

  // MCP Servers Configuration
  mcpServers: {
    gitMemory: {
      enabled: boolean;
      repositoryPath: string;
      maxCommits: number;
      enableBranchTracking: boolean;
    };
    database: {
      enabled: boolean;
      databasePath: string;
      enableLogging: boolean;
      maxConnections: number;
    };
    webScraper: {
      enabled: boolean;
      userAgent: string;
      timeout: number;
      maxRetries: number;
      enableCache: boolean;
    };
    filesystem: {
      enabled: boolean;
      allowedPaths: string[];
      maxFileSize: number;
      enableBackup: boolean;
    };
    tradingAI: {
      enabled: boolean;
      apiKeys?: {
        alphaVantage?: string;
        finnhub?: string;
      };
      enableRealTime: boolean;
    };
    multiFetch: {
      enabled: boolean;
      maxConcurrent: number;
      timeout: number;
      retryAttempts: number;
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
    performance: {
      enabled: boolean;
      sampleRate: number;
      retentionDays: number;
    };
  };

  // Security Configuration
  security: {
    jwt: {
      enabled: boolean;
      secret: string;
      expiresIn: string;
    };
    rateLimiting: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
    };
    encryption: {
      enabled: boolean;
      algorithm: string;
      key: string;
    };
  };

  // Monitoring Configuration
  monitoring: {
    enabled: boolean;
    metrics: {
      enabled: boolean;
      interval: number;
      retentionDays: number;
    };
    healthCheck: {
      enabled: boolean;
      interval: number;
      endpoints: string[];
    };
    alerts: {
      enabled: boolean;
      channels: {
        email?: string[];
        webhook?: string[];
      };
      thresholds: {
        errorRate: number;
        responseTime: number;
        memoryUsage: number;
      };
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
    stores: {
      memory: boolean;
      redis?: {
        host: string;
        port: number;
        password?: string;
      };
    };
  };

  // External Integrations
  integrations: {
    git?: {
      enabled: boolean;
      repositories: string[];
      autoSync: boolean;
    };
    webhooks?: {
      enabled: boolean;
      endpoints: string[];
      secret?: string;
    };
    apis?: {
      enabled: boolean;
      endpoints: Record<string, {
        url: string;
        method: string;
        headers?: Record<string, string>;
      }>;
    };
  };
}

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

  /**
   * โหลด configuration จากไฟล์
   */
  async load(): Promise<void> {
    try {
      console.log('🔄 กำลังโหลด Central MCP Configuration...');

      // อ่านไฟล์ config
      const fs = await import('fs/promises');
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);

      // ตรวจสอบความครบถ้วนของ config
      this.validateConfig();

      this.isLoaded = true;
      console.log('✅ โหลด Central MCP Configuration สำเร็จ');

    } catch (error) {
      console.error('❌ ไม่สามารถโหลด configuration:', error);
      throw error;
    }
  }

  /**
   * บันทึก configuration ไปยังไฟล์
   */
  async save(): Promise<void> {
    if (!this.isLoaded) {
      throw new Error('Configuration ยังไม่ได้โหลด');
    }

    try {
      const fs = await import('fs/promises');
      const configData = JSON.stringify(this.config, null, 2);

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const configDir = require('path').dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      await fs.writeFile(this.configPath, configData, 'utf-8');
      console.log('💾 บันทึก configuration สำเร็จ');

    } catch (error) {
      console.error('❌ ไม่สามารถบันทึก configuration:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบความครบถ้วนของ configuration
   */
  private validateConfig(): void {
    if (!this.config.server) {
      throw new Error('Server configuration missing');
    }
    if (!this.config.mcpServers) {
      throw new Error('MCP Servers configuration missing');
    }
    if (!this.config.database) {
      throw new Error('Database configuration missing');
    }
  }

  /**
   * ดึง configuration ทั้งหมด
   */
  getConfig(): MCPPlatformConfig {
    if (!this.isLoaded) {
      throw new Error('Configuration ยังไม่ได้โหลด');
    }
    return { ...this.config };
  }

  /**
   * ดึง configuration ของ MCP Server เฉพาะตัว
   */
  getMCPServerConfig(serverName: keyof MCPPlatformConfig['mcpServers']): any {
    if (!this.isLoaded) {
      throw new Error('Configuration ยังไม่ได้โหลด');
    }
    return { ...this.config.mcpServers[serverName] };
  }

  /**
   * อัปเดต configuration ของ MCP Server
   */
  updateMCPServerConfig(
    serverName: keyof MCPPlatformConfig['mcpServers'],
    updates: any
  ): void {
    if (!this.isLoaded) {
      throw new Error('Configuration ยังไม่ได้โหลด');
    }

    this.config.mcpServers[serverName] = {
      ...this.config.mcpServers[serverName],
      ...updates
    };
  }

  /**
   * ดึง configuration สำหรับ environment ปัจจุบัน
   */
  getEnvironmentConfig(): any {
    if (!this.isLoaded) {
      throw new Error('Configuration ยังไม่ได้โหลด');
    }

    const env = this.config.server.environment;
    const envConfig = {
      development: {
        logging: { level: 'debug' as const, format: 'text' as const },
        monitoring: { enabled: true, metrics: { enabled: true } },
        cache: { enabled: false }
      },
      production: {
        logging: { level: 'warn' as const, format: 'json' as const },
        monitoring: { enabled: true, metrics: { enabled: true } },
        cache: { enabled: true },
        security: { rateLimiting: { enabled: true } }
      },
      test: {
        logging: { level: 'error' as const, format: 'json' as const },
        monitoring: { enabled: false },
        cache: { enabled: false }
      }
    };

    return envConfig[env] || envConfig.development;
  }

  /**
   * สร้าง configuration เริ่มต้น
   */
  static createDefaultConfig(): MCPPlatformConfig {
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
      mcpServers: {
        gitMemory: {
          enabled: true,
          repositoryPath: process.cwd(),
          maxCommits: 100,
          enableBranchTracking: true
        },
        database: {
          enabled: true,
          databasePath: './data/mcp-platform.db',
          enableLogging: true,
          maxConnections: 10
        },
        webScraper: {
          enabled: true,
          userAgent: 'MCP-WebScraper/1.0 (Development)',
          timeout: 30000,
          maxRetries: 3,
          enableCache: true
        },
        filesystem: {
          enabled: true,
          allowedPaths: ['./src', './data'],
          maxFileSize: 10 * 1024 * 1024, // 10MB
          enableBackup: true
        },
        tradingAI: {
          enabled: true,
          enableRealTime: true
        },
        multiFetch: {
          enabled: true,
          maxConcurrent: 5,
          timeout: 30000,
          retryAttempts: 3
        }
      },
      database: {
        type: 'sqlite',
        connection: {},
        logging: {
          enabled: true,
          level: 'info',
          maxEntries: 10000
        },
        performance: {
          enabled: true,
          sampleRate: 0.1,
          retentionDays: 30
        }
      },
      security: {
        jwt: {
          enabled: false,
          secret: 'your-secret-key-change-in-production',
          expiresIn: '24h'
        },
        rateLimiting: {
          enabled: false,
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100
        },
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm',
          key: 'your-encryption-key-change-in-production'
        }
      },
      monitoring: {
        enabled: true,
        metrics: {
          enabled: true,
          interval: 60000, // 1 minute
          retentionDays: 7
        },
        healthCheck: {
          enabled: true,
          interval: 30000, // 30 seconds
          endpoints: ['/health', '/api/health']
        },
        alerts: {
          enabled: false,
          channels: {},
          thresholds: {
            errorRate: 0.05, // 5%
            responseTime: 5000, // 5 seconds
            memoryUsage: 0.8 // 80%
          }
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
        maxSize: 1000,
        stores: {
          memory: true
        }
      },
      integrations: {
        git: {
          enabled: true,
          repositories: [],
          autoSync: false
        },
        webhooks: {
          enabled: false,
          endpoints: []
        },
        apis: {
          enabled: false,
          endpoints: {}
        }
      }
    };
  }
}
