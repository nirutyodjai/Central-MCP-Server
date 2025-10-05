/**
 * Web Scraper MCP Server
 * ดึงข้อมูลจากเว็บไซต์สำหรับ MCP Platform
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

export interface ScrapingConfig {
  userAgent?: string;
  timeout: number;
  maxRetries: number;
  delayBetweenRequests: number;
  enableCache: boolean;
  cacheDuration: number; // milliseconds
}

export interface ScrapingResult {
  url: string;
  title?: string;
  content?: string;
  links: string[];
  images: string[];
  metadata: {
    statusCode: number;
    responseTime: number;
    contentLength?: number;
    lastModified?: string;
  };
  scrapedAt: string;
  success: boolean;
  error?: string;
}

export interface ScrapingOptions {
  includeImages?: boolean;
  includeLinks?: boolean;
  maxContentLength?: number;
  selectors?: {
    title?: string;
    content?: string;
    links?: string;
    images?: string;
  };
  headers?: Record<string, string>;
}

export class WebScraperMCPServer {
  private config: ScrapingConfig;
  private cache: Map<string, { data: ScrapingResult; expires: number }>;
  private isInitialized: boolean = false;

  constructor(config: ScrapingConfig) {
    this.config = config;
    this.cache = new Map();
  }

  /**
   * เริ่มต้น Web Scraper MCP Server
   */
  async initialize(): Promise<void> {
    console.log('🌐 กำลังเริ่มต้น Web Scraper MCP Server...');

    // ล้าง cache ที่หมดอายุ
    if (this.config.enableCache) {
      this.cleanExpiredCache();
      console.log('💾 เปิดใช้งาน cache สำหรับ web scraping');
    }

    this.isInitialized = true;
    console.log('✅ Web Scraper MCP Server พร้อมใช้งาน');
  }

  /**
   * ดึงข้อมูลจาก URL
   */
  async scrapeUrl(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    // ตรวจสอบ cache ก่อน
    if (this.config.enableCache) {
      const cached = this.getCachedResult(url);
      if (cached) {
        console.log(`💾 ใช้ข้อมูลจาก cache สำหรับ: ${url}`);
        return cached;
      }
    }

    try {
      console.log(`🔍 กำลัง scrape: ${url}`);

      // ตั้งค่า headers
      const headers = {
        'User-Agent': this.config.userAgent || 'MCP-WebScraper/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        ...options.headers
      };

      // ส่ง HTTP request
      const response = await axios.get(url, {
        headers,
        timeout: this.config.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      const responseTime = Date.now() - startTime;

      // โหลด HTML ด้วย cheerio
      const $ = cheerio.load(response.data);

      // ดึงข้อมูลตาม options
      const result: ScrapingResult = {
        url,
        title: this.extractTitle($, options),
        content: this.extractContent($, options),
        links: options.includeLinks !== false ? this.extractLinks($, url, options) : [],
        images: options.includeImages !== false ? this.extractImages($, url, options) : [],
        metadata: {
          statusCode: response.status,
          responseTime,
          contentLength: response.data.length,
          lastModified: response.headers['last-modified']
        },
        scrapedAt: new Date().toISOString(),
        success: true
      };

      // บันทึกใน cache
      if (this.config.enableCache) {
        this.setCachedResult(url, result);
      }

      console.log(`✅ Scrape สำเร็จ: ${url} (${responseTime}ms)`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      const errorResult: ScrapingResult = {
        url,
        links: [],
        images: [],
        metadata: {
          statusCode: 0,
          responseTime
        },
        scrapedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.error(`❌ Scrape ไม่สำเร็จ: ${url}`, error);

      // บันทึก error ใน cache ชั่วคราว
      if (this.config.enableCache) {
        this.setCachedResult(url, errorResult);
      }

      return errorResult;
    }
  }

  /**
   * ดึง title จาก HTML
   */
  private extractTitle($: cheerio.CheerioAPI, options: ScrapingOptions): string | undefined {
    const selector = options.selectors?.title || 'title';
    return $(selector).first().text().trim() || undefined;
  }

  /**
   * ดึงเนื้อหาหลักจาก HTML
   */
  private extractContent($: cheerio.CheerioAPI, options: ScrapingOptions): string | undefined {
    const selector = options.selectors?.content || 'body';
    const $element = $(selector).first();

    // ลบสคริปต์และสไตล์ออก
    $element.find('script, style, nav, header, footer, aside').remove();

    const content = $element.text().trim();

    if (options.maxContentLength) {
      return content.substring(0, options.maxContentLength);
    }

    return content || undefined;
  }

  /**
   * ดึง links จาก HTML
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string, options: ScrapingOptions): string[] {
    const selector = options.selectors?.links || 'a[href]';
    const links: string[] = [];

    $(selector).each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch {
          // ข้าม links ที่ไม่ valid
        }
      }
    });

    // ลบ duplicates และ external links ถ้าต้องการ
    return [...new Set(links)];
  }

  /**
   * ดึง images จาก HTML
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string, options: ScrapingOptions): string[] {
    const selector = options.selectors?.images || 'img[src]';
    const images: string[] = [];

    $(selector).each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          images.push(absoluteUrl);
        } catch {
          // ข้าม images ที่ไม่ valid
        }
      }
    });

    return [...new Set(images)];
  }

  /**
   * ดึงข้อมูลจากหลาย URLs พร้อมกัน
   */
  async scrapeMultipleUrls(urls: string[], options: ScrapingOptions = {}): Promise<ScrapingResult[]> {
    console.log(`🔍 กำลัง scrape ${urls.length} URLs พร้อมกัน...`);

    // รอ delay ระหว่าง requests เพื่อไม่ให้เว็บไซต์ block
    const results: ScrapingResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const result = await this.scrapeUrl(url, options);
      results.push(result);

      // เพิ่ม delay ระหว่าง requests (ยกเว้น request สุดท้าย)
      if (i < urls.length - 1 && this.config.delayBetweenRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Scrape เสร็จสิ้น: ${successCount}/${urls.length} สำเร็จ`);

    return results;
  }

  /**
   * ค้นหาและดึงข้อมูลตาม pattern
   */
  async searchAndScrape(searchQuery: string, options: {
    maxResults?: number;
    site?: string;
    scrapeOptions?: ScrapingOptions;
  } = {}): Promise<ScrapingResult[]> {
    console.log(`🔍 ค้นหาและ scrape: "${searchQuery}"`);

    // ในสถานการณ์จริงควรใช้ search engine API หรือวิธีอื่น
    // ที่นี่จะเป็นการจำลองการค้นหา
    const mockResults = [
      `https://example.com/search?q=${encodeURIComponent(searchQuery)}`,
      `https://test.com/results?search=${encodeURIComponent(searchQuery)}`
    ];

    const urls = options.site
      ? [`${options.site}?q=${encodeURIComponent(searchQuery)}`]
      : mockResults;

    const limitedUrls = urls.slice(0, options.maxResults || 5);

    return await this.scrapeMultipleUrls(limitedUrls, options.scrapeOptions || {});
  }

  /**
   * ดาวน์โหลดและบันทึกเนื้อหา
   */
  async downloadContent(url: string, savePath?: string): Promise<boolean> {
    try {
      const result = await this.scrapeUrl(url);

      if (!result.success || !result.content) {
        console.error(`❌ ไม่สามารถดาวน์โหลดเนื้อหาจาก: ${url}`);
        return false;
      }

      const filePath = savePath || path.join(process.cwd(), 'data', 'scraped', `${Date.now()}.txt`);

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // บันทึกเนื้อหา
      const content = [
        `URL: ${result.url}`,
        `Title: ${result.title || 'ไม่มีชื่อ'}`,
        `Scraped At: ${result.scrapedAt}`,
        `Status: ${result.metadata.statusCode}`,
        `Response Time: ${result.metadata.responseTime}ms`,
        '',
        'Content:',
        '========',
        result.content
      ].join('\n');

      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`💾 บันทึกเนื้อหาไปที่: ${filePath}`);

      return true;
    } catch (error) {
      console.error(`❌ ไม่สามารถดาวน์โหลดเนื้อหา:`, error);
      return false;
    }
  }

  /**
   * จัดการ cache
   */
  private setCachedResult(url: string, result: ScrapingResult): void {
    this.cache.set(url, {
      data: result,
      expires: Date.now() + this.config.cacheDuration
    });
  }

  private getCachedResult(url: string): ScrapingResult | null {
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(url); // ลบ cache ที่หมดอายุ
    }

    return null;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [url, cached] of this.cache.entries()) {
      if (cached.expires <= now) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * ดึงสถิติการ scraping
   */
  getScrapingStats(): any {
    const cacheSize = this.cache.size;
    const expiredCount = Array.from(this.cache.values()).filter(c => c.expires <= Date.now()).length;

    return {
      cacheSize,
      expiredEntries: expiredCount,
      activeEntries: cacheSize - expiredCount,
      cacheDuration: this.config.cacheDuration,
      isEnabled: this.config.enableCache
    };
  }

  /**
   * ล้าง cache ทั้งหมด
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ ล้าง cache เสร็จสิ้น');
  }
}

/**
 * ฟังก์ชันสำหรับ launch Web Scraper MCP Server
 */
export async function launchWebScraperMCP(gitMemory: any, platform: any): Promise<WebScraperMCPServer> {
  console.log('🕸️ Launching Web Scraper MCP Server...');

  const scraperServer = new WebScraperMCPServer({
    userAgent: 'MCP-WebScraper/1.0 (Development)',
    timeout: 30000,
    maxRetries: 3,
    delayBetweenRequests: 1000,
    enableCache: true,
    cacheDuration: 5 * 60 * 1000 // 5 นาที
  });

  try {
    await scraperServer.initialize();

    // แสดงสถิติ
    const stats = scraperServer.getScrapingStats();
    console.log('📊 Web Scraper Stats:', stats);

    console.log('✅ Web Scraper MCP Server เริ่มทำงานสำเร็จ');

    return scraperServer;
  } catch (error) {
    console.error('❌ ไม่สามารถเริ่ม Web Scraper MCP Server:', error);
    throw error;
  }
}
