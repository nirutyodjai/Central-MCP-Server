/**
 * Web Data Integration with Git Memory MCP
 * รวมการดึงข้อมูลจากเว็บเข้ากับระบบ Git Memory
 */

// Import MCP servers ที่เกี่ยวข้องกับการดึงข้อมูลจากเว็บ
import {
  scrapeEGPProjects,
  scrapeMultipleSources,
  testEGPConnection,
} from '../egp-scraper-real.js';
import {
  fetchProcurementInfo,
  fetchMaterialPrices,
  checkWebsiteStatus,
} from '../fetch-mcp-demo.js';

// Git Memory Integration
export class WebDataGitMemoryIntegration {
  private gitMemory: any; // Git Memory MCP instance
  private webScrapers: Map<string, WebScraper> = new Map();

  constructor(gitMemoryInstance: any) {
    this.gitMemory = gitMemoryInstance;
    this.initializeWebScrapers();
  }

  private initializeWebScrapers(): void {
    // Register web scrapers
    this.webScrapers.set('egp-scraper', {
      name: 'e-GP Project Scraper',
      description: 'ดึงข้อมูลงานประมูลจาก e-GP',
      function: this.scrapeEGPData.bind(this),
      schedule: '0 */6 * * *', // ทุก 6 ชั่วโมง
      enabled: true,
    });

    this.webScrapers.set('procurement-fetcher', {
      name: 'Procurement Information Fetcher',
      description: 'ดึงข้อมูลการจัดซื้อจัดจ้าง',
      function: this.fetchProcurementData.bind(this),
      schedule: '0 */12 * * *', // ทุก 12 ชั่วโมง
      enabled: true,
    });

    this.webScrapers.set('material-prices', {
      name: 'Material Prices Monitor',
      description: 'ติดตามราคาวัสดุก่อสร้าง',
      function: this.monitorMaterialPrices.bind(this),
      schedule: '0 9 * * *', // ทุกวัน 9 โมงเช้า
      enabled: true,
    });

    this.webScrapers.set('website-monitor', {
      name: 'Website Status Monitor',
      description: 'ตรวจสอบสถานะเว็บไซต์ที่เกี่ยวข้อง',
      function: this.monitorWebsiteStatus.bind(this),
      schedule: '*/30 * * * *', // ทุก 30 นาที
      enabled: true,
    });
  }

  // Main integration function
  async integrateWebDataWithGitMemory(): Promise<void> {
    console.log('🔗 Starting Web Data Integration with Git Memory...');

    try {
      // Test connections first
      await this.testAllConnections();

      // Run initial data collection
      await this.collectAllWebData();

      // Setup scheduled tasks
      await this.setupScheduledTasks();

      console.log('✅ Web Data Integration completed successfully');
    } catch (error) {
      console.error('❌ Web Data Integration failed:', error);
      throw error;
    }
  }

  private async testAllConnections(): Promise<void> {
    console.log('🔍 Testing web scraper connections...');

    // Test e-GP connection
    const egpConnection = await testEGPConnection();
    await this.gitMemory.store({
      type: 'connection_test',
      source: 'egp',
      result: egpConnection,
      timestamp: new Date().toISOString(),
    });

    // Test other website connections
    const websites = [
      'https://en.wikipedia.org/wiki/Public_procurement',
      'https://www.example-supplier1.com',
      'https://www.government-news.com',
    ];

    for (const website of websites) {
      const status = await checkWebsiteStatus(website);
      await this.gitMemory.store({
        type: 'connection_test',
        source: 'website',
        url: website,
        result: status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async collectAllWebData(): Promise<void> {
    console.log('📊 Collecting web data...');

    // Collect e-GP projects
    await this.scrapeEGPData();

    // Collect procurement information
    await this.fetchProcurementData();

    // Monitor material prices
    await this.monitorMaterialPrices();

    // Monitor website status
    await this.monitorWebsiteStatus();
  }

  private async setupScheduledTasks(): Promise<void> {
    console.log('⏰ Setting up scheduled tasks...');

    // Setup cron-like scheduling for each scraper
    for (const [key, scraper] of this.webScrapers) {
      if (scraper.enabled) {
        // Store schedule configuration in Git Memory
        await this.gitMemory.store({
          type: 'schedule_config',
          scraper: key,
          schedule: scraper.schedule,
          enabled: true,
          timestamp: new Date().toISOString(),
        });

        console.log(`📅 Scheduled: ${scraper.name} (${scraper.schedule})`);
      }
    }
  }

  // e-GP Data Collection
  private async scrapeEGPData(): Promise<void> {
    try {
      console.log('🏗️ Scraping e-GP projects...');

      // Scrape current projects
      const currentProjects = await scrapeEGPProjects('', { limit: 50 });

      // Get previously stored projects for comparison
      const previousProjects = await this.gitMemory.retrieve({
        type: 'egp_projects',
        limit: 1000,
      });

      // Find new projects
      const existingIds = new Set(previousProjects.map((p: any) => p.id));
      const newProjects = currentProjects.filter(p => !existingIds.has(p.id));

      if (newProjects.length > 0) {
        console.log(`🆕 Found ${newProjects.length} new e-GP projects`);

        // Store new projects in Git Memory
        for (const project of newProjects) {
          await this.gitMemory.store({
            type: 'egp_project',
            data: project,
            scraped_at: new Date().toISOString(),
            status: 'new',
          });
        }

        // Update project status
        await this.gitMemory.store({
          type: 'egp_scrape_summary',
          total_projects: currentProjects.length,
          new_projects: newProjects.length,
          timestamp: new Date().toISOString(),
        });
      }

      // Store all current projects
      await this.gitMemory.store({
        type: 'egp_projects',
        data: currentProjects,
        count: currentProjects.length,
        scraped_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Failed to scrape e-GP data:', error);
      await this.gitMemory.store({
        type: 'error',
        operation: 'egp_scraping',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Procurement Information Collection
  private async fetchProcurementData(): Promise<void> {
    try {
      console.log('📋 Fetching procurement information...');

      // Fetch procurement info from Wikipedia
      const procurementInfo = await fetchProcurementInfo();

      // Fetch from multiple sources
      const materialPrices = await fetchMaterialPrices('เหล็กเส้น');

      // Store procurement data
      await this.gitMemory.store({
        type: 'procurement_info',
        wikipedia_data: procurementInfo,
        material_prices: materialPrices,
        fetched_at: new Date().toISOString(),
      });

      console.log('✅ Procurement data stored in Git Memory');
    } catch (error) {
      console.error('❌ Failed to fetch procurement data:', error);
    }
  }

  // Material Price Monitoring
  private async monitorMaterialPrices(): Promise<void> {
    try {
      console.log('💰 Monitoring material prices...');

      const materials = ['เหล็กเส้น', 'ปูนซีเมนต์', 'ทราย', 'หิน'];
      const priceData: any = {};

      for (const material of materials) {
        const prices = await fetchMaterialPrices(material);
        priceData[material] = prices;

        // Calculate price statistics
        const priceValues = prices.map((p: any) => p.price).filter(Boolean);
        if (priceValues.length > 0) {
          const avgPrice =
            priceValues.reduce((a: number, b: number) => a + b, 0) /
            priceValues.length;
          const minPrice = Math.min(...priceValues);
          const maxPrice = Math.max(...priceValues);

          priceData[material + '_stats'] = {
            average: avgPrice,
            min: minPrice,
            max: maxPrice,
            count: priceValues.length,
          };
        }
      }

      // Store price monitoring data
      await this.gitMemory.store({
        type: 'material_price_monitoring',
        data: priceData,
        monitored_at: new Date().toISOString(),
        materials_tracked: materials.length,
      });

      console.log(
        `✅ Material prices monitored for ${materials.length} materials`
      );
    } catch (error) {
      console.error('❌ Failed to monitor material prices:', error);
    }
  }

  // Website Status Monitoring
  private async monitorWebsiteStatus(): Promise<void> {
    try {
      console.log('🌐 Monitoring website status...');

      const websites = [
        'https://process3.gprocurement.go.th',
        'https://en.wikipedia.org/wiki/Public_procurement',
        'https://www.government-news.com',
        'https://www.example-supplier1.com',
      ];

      const statusData: any[] = [];

      for (const website of websites) {
        const status = await checkWebsiteStatus(website);
        statusData.push(status);

        // Alert if website is down
        if (!status.isOnline) {
          await this.gitMemory.store({
            type: 'website_alert',
            website: website,
            status: status,
            alert_type: 'website_down',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Store monitoring summary
      await this.gitMemory.store({
        type: 'website_monitoring',
        data: statusData,
        monitored_at: new Date().toISOString(),
        total_websites: websites.length,
        online_websites: statusData.filter(s => s.isOnline).length,
      });

      console.log(
        `✅ Website status monitored for ${websites.length} websites`
      );
    } catch (error) {
      console.error('❌ Failed to monitor website status:', error);
    }
  }

  // Get integration statistics
  async getIntegrationStats(): Promise<any> {
    try {
      // Get data from Git Memory
      const egpProjects = await this.gitMemory.retrieve({
        type: 'egp_projects',
      });
      const procurementData = await this.gitMemory.retrieve({
        type: 'procurement_info',
      });
      const priceData = await this.gitMemory.retrieve({
        type: 'material_price_monitoring',
      });
      const websiteData = await this.gitMemory.retrieve({
        type: 'website_monitoring',
      });

      return {
        total_egp_projects: egpProjects.length,
        procurement_sources: procurementData.length,
        price_monitoring_entries: priceData.length,
        website_monitoring_entries: websiteData.length,
        last_updated: new Date().toISOString(),
        scrapers_configured: this.webScrapers.size,
        scrapers_enabled: Array.from(this.webScrapers.values()).filter(
          s => s.enabled
        ).length,
      };
    } catch (error) {
      console.error('❌ Failed to get integration stats:', error);
      return null;
    }
  }

  // Cleanup old data
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    try {
      console.log(`🧹 Cleaning up data older than ${daysToKeep} days...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Remove old monitoring data
      await this.gitMemory.cleanup({
        before: cutoffDate.toISOString(),
        types: ['website_monitoring', 'material_price_monitoring'],
      });

      console.log('✅ Old data cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
    }
  }
}

// Web Scraper interface
interface WebScraper {
  name: string;
  description: string;
  function: () => Promise<void>;
  schedule: string;
  enabled: boolean;
}

// Integration launcher
export async function launchWebDataIntegration(
  gitMemoryInstance: any
): Promise<void> {
  console.log('🚀 Launching Web Data Integration with Git Memory...');

  const integration = new WebDataGitMemoryIntegration(gitMemoryInstance);

  try {
    // Run initial integration
    await integration.integrateWebDataWithGitMemory();

    // Get and display statistics
    const stats = await integration.getIntegrationStats();
    console.log('📊 Integration Statistics:', stats);

    console.log(
      '✅ Web Data Integration with Git Memory completed successfully!'
    );
    console.log(
      '🔄 Data will be automatically collected according to configured schedules'
    );
  } catch (error) {
    console.error('❌ Failed to launch Web Data Integration:', error);
    throw error;
  }
}
