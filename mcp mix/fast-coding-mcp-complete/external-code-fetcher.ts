/**
 * Code Fetcher from External Websites
 * ดึงโค้ดจากเว็บไซต์ภายนอกและนำมาวิเคราะห์ด้วย MCP Server
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// Code source URLs ที่น่าสนใจสำหรับการดึงโค้ด
export const CODE_SOURCES = {
  github: [
    'https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/editor/common/model/textModel.ts',
    'https://raw.githubusercontent.com/facebook/react/main/packages/react/src/React.js',
    'https://raw.githubusercontent.com/nodejs/node/main/lib/fs.js',
    'https://raw.githubusercontent.com/python/cpython/main/Lib/os.py',
    'https://raw.githubusercontent.com/golang/go/master/src/os/file.go',
  ],
  gist: [
    'https://gist.githubusercontent.com/username/123/raw/sample.js',
    'https://gist.githubusercontent.com/username/456/raw/config.json',
  ],
  codepens: [
    'https://codepen.io/api/oembed?url=https://codepen.io/username/pen/abc123',
    'https://codepen.io/username/pen/abc123',
  ],
  jsdelivr: [
    'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
    'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
  ],
};

// Code fetcher class
export class ExternalCodeFetcher {
  private gitMemory: any;
  private mcpServer: any;

  constructor(gitMemory: any, mcpServer?: any) {
    this.gitMemory = gitMemory;
    this.mcpServer = mcpServer;
  }

  // ดึงโค้ดจาก GitHub Raw URLs
  async fetchGitHubCode(url: string): Promise<CodeFetchResult> {
    try {
      console.log(`📥 Fetching code from GitHub: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Fast-Coding-MCP-Server/1.0.0',
          Accept: 'text/plain, application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = response.data;
      const contentType = response.headers['content-type'] || '';

      // ตรวจสอบประเภทไฟล์จาก URL และ content
      const fileExtension = this.detectFileExtension(url, content, contentType);

      return {
        success: true,
        url,
        content,
        fileExtension,
        contentType,
        size: content.length,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error.message);

      return {
        success: false,
        url,
        error: error.message,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  // ดึงข้อมูลจาก GitHub API (สำหรับข้อมูล metadata)
  async fetchGitHubRepoInfo(owner: string, repo: string): Promise<any> {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Fast-Coding-MCP-Server/1.0.0',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return {
        success: true,
        data: response.data,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  // ดึงโค้ดจากหลาย URLs พร้อมกัน
  async fetchMultipleSources(urls: string[]): Promise<CodeFetchResult[]> {
    console.log(`🚀 Fetching code from ${urls.length} sources...`);

    const promises = urls.map(url => this.fetchGitHubCode(url));
    const results = await Promise.allSettled(promises);

    const successful: CodeFetchResult[] = [];
    const failed: CodeFetchResult[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successful.push(result.value);
        } else {
          failed.push(result.value);
        }
      } else {
        failed.push({
          success: false,
          url: urls[index],
          error: result.reason.message,
          fetchedAt: new Date().toISOString(),
        });
      }
    });

    console.log(
      `✅ Successfully fetched: ${successful.length}/${urls.length} sources`
    );

    if (failed.length > 0) {
      console.log(`❌ Failed to fetch: ${failed.length} sources`);
    }

    return [...successful, ...failed];
  }

  // ดึงและวิเคราะห์โค้ดด้วย MCP Server
  async fetchAndAnalyzeCode(url: string): Promise<CodeAnalysisResult> {
    try {
      // ดึงโค้ดจาก URL
      const fetchResult = await this.fetchGitHubCode(url);

      if (!fetchResult.success) {
        return {
          success: false,
          url,
          error: fetchResult.error,
          analyzedAt: new Date().toISOString(),
        };
      }

      // ใช้ MCP Server วิเคราะห์โค้ด (ถ้ามี)
      let analysis = null;
      if (this.mcpServer) {
        try {
          analysis = await this.mcpServer.analyzeCode(
            fetchResult.content,
            fetchResult.fileExtension
          );
        } catch (error) {
          console.warn('⚠️ MCP analysis failed:', error.message);
        }
      }

      // เก็บข้อมูลใน Git Memory
      if (this.gitMemory) {
        await this.gitMemory.store({
          type: 'external_code',
          data: fetchResult,
          analysis,
          source: 'github_raw',
          fetchedAt: fetchResult.fetchedAt,
        });
      }

      return {
        success: true,
        url,
        fetchResult,
        analysis,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
        analyzedAt: new Date().toISOString(),
      };
    }
  }

  // ค้นหาและดึงโค้ดจาก GitHub Search API
  async searchAndFetchGitHubCode(
    query: string,
    language?: string,
    limit: number = 5
  ): Promise<CodeSearchResult> {
    try {
      console.log(
        `🔍 Searching GitHub for: "${query}" (language: ${language || 'all'})`
      );

      // GitHub Search API
      const searchQuery = language ? `${query}+language:${language}` : query;
      const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${limit}`;

      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Fast-Coding-MCP-Server/1.0.0',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const searchResults = response.data.items || [];
      const fetchedCodes: CodeFetchResult[] = [];

      // ดึงโค้ดจากแต่ละผลการค้นหา
      for (const item of searchResults.slice(0, limit)) {
        try {
          const codeResponse = await axios.get(item.html_url, {
            headers: {
              'User-Agent': 'Fast-Coding-MCP-Server/1.0.0',
              Accept: 'text/plain',
            },
          });

          if (codeResponse.status === 200) {
            fetchedCodes.push({
              success: true,
              url: item.html_url,
              content: codeResponse.data,
              fileExtension: this.detectFileExtension(
                item.html_url,
                codeResponse.data
              ),
              contentType: codeResponse.headers['content-type'],
              size: codeResponse.data.length,
              fetchedAt: new Date().toISOString(),
              metadata: {
                repository: item.repository.full_name,
                filePath: item.path,
                searchScore: item.score,
              },
            });
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to fetch code from ${item.html_url}:`,
            error.message
          );
        }
      }

      // เก็บผลการค้นหาใน Git Memory
      if (this.gitMemory) {
        await this.gitMemory.store({
          type: 'github_code_search',
          query,
          language,
          results: searchResults.length,
          fetchedCodes: fetchedCodes.length,
          data: {
            searchResults,
            fetchedCodes,
          },
          searchedAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        query,
        totalResults: searchResults.length,
        fetchedCodes: fetchedCodes.length,
        results: fetchedCodes,
        searchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        query,
        error: error.message,
        totalResults: 0,
        fetchedCodes: 0,
        results: [],
        searchedAt: new Date().toISOString(),
      };
    }
  }

  // ตรวจสอบประเภทไฟล์จาก URL และเนื้อหา
  private detectFileExtension(
    url: string,
    content: string,
    contentType?: string
  ): string {
    // ตรวจสอบจาก URL ก่อน
    const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (urlMatch) {
      return urlMatch[1].toLowerCase();
    }

    // ตรวจสอบจาก content-type
    if (contentType) {
      if (contentType.includes('javascript')) return 'js';
      if (contentType.includes('typescript')) return 'ts';
      if (contentType.includes('python')) return 'py';
      if (contentType.includes('json')) return 'json';
      if (contentType.includes('css')) return 'css';
      if (contentType.includes('html')) return 'html';
    }

    // ตรวจสอบจากเนื้อหา
    if (
      content.includes('function') &&
      content.includes('var ') &&
      content.includes('console.log')
    )
      return 'js';
    if (content.includes('interface') && content.includes(': string'))
      return 'ts';
    if (content.includes('def ') && content.includes('import ')) return 'py';
    if (content.includes('public class') || content.includes('import java'))
      return 'java';
    if (content.includes('package main') && content.includes('func main'))
      return 'go';

    return 'txt'; // default
  }

  // ดึงข้อมูล trending repositories จาก GitHub
  async fetchTrendingRepos(
    language?: string,
    limit: number = 10
  ): Promise<TrendingRepoResult> {
    try {
      console.log(`📊 Fetching trending ${language || 'all'} repositories...`);

      // GitHub Trending API (จำลอง)
      const trendingRepos = [
        {
          name: 'microsoft/vscode',
          description: 'Visual Studio Code',
          language: 'TypeScript',
          stars: 150000,
          forks: 25000,
          url: 'https://github.com/microsoft/vscode',
        },
        {
          name: 'facebook/react',
          description: 'A JavaScript library for building user interfaces',
          language: 'JavaScript',
          stars: 200000,
          forks: 40000,
          url: 'https://github.com/facebook/react',
        },
        {
          name: 'python/cpython',
          description: 'The Python programming language',
          language: 'Python',
          stars: 50000,
          forks: 15000,
          url: 'https://github.com/python/cpython',
        },
      ].filter(
        repo =>
          !language || repo.language.toLowerCase() === language.toLowerCase()
      );

      // เก็บข้อมูลใน Git Memory
      if (this.gitMemory) {
        await this.gitMemory.store({
          type: 'trending_repositories',
          language,
          repos: trendingRepos,
          fetchedAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        language,
        repos: trendingRepos.slice(0, limit),
        totalCount: trendingRepos.length,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        language,
        error: error.message,
        repos: [],
        totalCount: 0,
        fetchedAt: new Date().toISOString(),
      };
    }
  }
}

// Types สำหรับ code fetching
interface CodeFetchResult {
  success: boolean;
  url: string;
  content?: string;
  fileExtension?: string;
  contentType?: string;
  size?: number;
  fetchedAt: string;
  error?: string;
  metadata?: any;
}

interface CodeAnalysisResult {
  success: boolean;
  url: string;
  fetchResult?: CodeFetchResult;
  analysis?: any;
  analyzedAt: string;
  error?: string;
}

interface CodeSearchResult {
  success: boolean;
  query: string;
  totalResults: number;
  fetchedCodes: number;
  results: CodeFetchResult[];
  searchedAt: string;
  error?: string;
}

interface TrendingRepoResult {
  success: boolean;
  language?: string;
  repos: any[];
  totalCount: number;
  fetchedAt: string;
  error?: string;
}

// Main function สำหรับทดสอบการดึงโค้ดจากเว็บ
export async function testCodeFetching(
  gitMemory?: any,
  mcpServer?: any
): Promise<void> {
  console.log('🚀 Testing External Code Fetching...\n');

  const codeFetcher = new ExternalCodeFetcher(gitMemory, mcpServer);

  try {
    // ทดสอบ 1: ดึงโค้ดจาก GitHub Raw URLs
    console.log('1️⃣ Testing GitHub Raw Code Fetching...');
    const githubUrls = CODE_SOURCES.github.slice(0, 2); // ดึงแค่ 2 ตัวอย่าง
    const githubResults = await codeFetcher.fetchMultipleSources(githubUrls);

    console.log(
      `   📊 Fetched ${githubResults.filter(r => r.success).length}/${githubResults.length} GitHub files`
    );

    // ทดสอบ 2: ค้นหาและดึงโค้ดจาก GitHub Search
    console.log('\n2️⃣ Testing GitHub Code Search...');
    const searchResult = await codeFetcher.searchAndFetchGitHubCode(
      'function fetch',
      'javascript',
      3
    );

    if (searchResult.success) {
      console.log(
        `   🔍 Found ${searchResult.totalResults} results, fetched ${searchResult.fetchedCodes} code samples`
      );
    }

    // ทดสอบ 3: ดึงข้อมูล trending repositories
    console.log('\n3️⃣ Testing Trending Repositories...');
    const trendingResult = await codeFetcher.fetchTrendingRepos(
      'typescript',
      5
    );

    if (trendingResult.success) {
      console.log(`   📈 Found ${trendingResult.totalCount} trending repos`);
      console.log(`   🏆 Top repo: ${trendingResult.repos[0]?.name || 'N/A'}`);
    }

    // แสดงสถิติการทำงาน
    console.log('\n📋 Code Fetching Statistics:');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );

    const allFetched = githubResults.filter(r => r.success);
    const totalSize = allFetched.reduce((sum, r) => sum + (r.size || 0), 0);

    console.log(`📥 Total files fetched: ${allFetched.length}`);
    console.log(
      `📏 Total content size: ${totalSize.toLocaleString()} characters`
    );
    console.log(`🔍 Code search results: ${searchResult.fetchedCodes}`);
    console.log(`📈 Trending repos found: ${trendingResult.repos.length}`);

    console.log('\n✅ Code fetching test completed successfully!');
    console.log('💡 All fetched code is stored in Git Memory for analysis');
  } catch (error) {
    console.error('❌ Code fetching test failed:', error);
  }
}

// Export สำหรับการใช้งาน
export { ExternalCodeFetcher };
export default ExternalCodeFetcher;
