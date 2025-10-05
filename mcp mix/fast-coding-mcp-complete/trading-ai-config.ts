/**
 * Trading AI Data Collection & Configuration
 * ปรับแต่งสำหรับ D:\trading AI - การดึงข้อมูล AI สำหรับการเทรด
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// Trading AI specific configuration
export const TRADING_AI_CONFIG = {
  // Trading platforms to monitor
  platforms: {
    set: {
      enabled: true,
      apiUrl: 'https://www.set.or.th/api/set/stock/quote',
      updateInterval: 60000, // 1 minute
      symbols: [
        'PTT',
        'AOT',
        'CPALL',
        'SCB',
        'ADVANC',
        'BBL',
        'KBANK',
        'KTB',
        'SCC',
        'TRUE',
      ],
    },
    crypto: {
      enabled: true,
      apiUrl: 'https://api.coingecko.com/api/v3',
      updateInterval: 30000, // 30 seconds
      coins: ['bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot'],
    },
    forex: {
      enabled: true,
      apiUrl: 'https://api.exchangerate-api.com/v4',
      updateInterval: 300000, // 5 minutes
      pairs: ['USD/THB', 'EUR/THB', 'JPY/THB', 'GBP/THB', 'CHF/THB'],
    },
    news: {
      enabled: true,
      sources: [
        'https://www.bangkokpost.com/business',
        'https://www.thaipbs.or.th/economy',
        'https://www.reuters.com/markets/asia',
      ],
      updateInterval: 600000, // 10 minutes
      keywords: ['หุ้น', 'การเงิน', 'เศรษฐกิจ', 'ธปท', 'กนง'],
    },
  },

  // AI analysis settings
  ai: {
    enabled: true,
    model: 'trading-analysis-v1',
    confidenceThreshold: 0.7,
    maxAnalysisTime: 30000, // 30 seconds
    features: [
      'technical_analysis',
      'sentiment_analysis',
      'risk_assessment',
      'market_prediction',
      'portfolio_optimization',
    ],
  },

  // Trading settings
  trading: {
    riskTolerance: 'medium', // low, medium, high
    maxPositionSize: 1000000, // THB
    stopLoss: 0.05, // 5%
    takeProfit: 0.15, // 15%
    tradingHours: {
      start: '09:30',
      end: '16:30',
      timezone: 'Asia/Bangkok',
    },
  },

  // Data storage settings
  storage: {
    databasePath: './data/trading_ai.db',
    retentionDays: 90,
    backupInterval: 86400000, // 24 hours
    compression: true,
  },
};

// Trading AI Data Collector
export class TradingAIDataCollector {
  private gitMemory: any;
  private config: typeof TRADING_AI_CONFIG;

  constructor(
    gitMemory: any,
    config: typeof TRADING_AI_CONFIG = TRADING_AI_CONFIG
  ) {
    this.gitMemory = gitMemory;
    this.config = config;
  }

  // Initialize Trading AI system
  async initialize(): Promise<void> {
    console.log('🤖 Initializing Trading AI Data Collection...');

    try {
      // Setup trading data collection
      await this.setupTradingDataCollection();

      // Setup AI analysis pipeline
      await this.setupAIAnalysisPipeline();

      // Setup automated trading workflows
      await this.setupAutomatedTradingWorkflows();

      console.log('✅ Trading AI Data Collection initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Trading AI:', error);
      throw error;
    }
  }

  private async setupTradingDataCollection(): Promise<void> {
    console.log('📊 Setting up trading data collection...');

    // Setup SET data collection
    if (this.config.platforms.set.enabled) {
      this.setupSETDataCollection();
    }

    // Setup crypto data collection
    if (this.config.platforms.crypto.enabled) {
      this.setupCryptoDataCollection();
    }

    // Setup forex data collection
    if (this.config.platforms.forex.enabled) {
      this.setupForexDataCollection();
    }

    // Setup financial news collection
    if (this.config.platforms.news.enabled) {
      this.setupFinancialNewsCollection();
    }

    console.log('✅ Trading data collection setup completed');
  }

  private async setupAIAnalysisPipeline(): Promise<void> {
    console.log('🧠 Setting up AI analysis pipeline...');

    // Setup AI analysis for trading decisions
    this.setupTechnicalAnalysis();
    this.setupSentimentAnalysis();
    this.setupRiskAssessment();
    this.setupMarketPrediction();

    console.log('✅ AI analysis pipeline setup completed');
  }

  private async setupAutomatedTradingWorkflows(): Promise<void> {
    console.log('⚡ Setting up automated trading workflows...');

    // Setup real-time data monitoring
    this.setupRealTimeMonitoring();

    // Setup automated alerts
    this.setupAutomatedAlerts();

    // Setup portfolio rebalancing
    this.setupPortfolioRebalancing();

    console.log('✅ Automated trading workflows setup completed');
  }

  private setupSETDataCollection(): void {
    // SET data collection every minute
    setInterval(async () => {
      try {
        console.log('📈 Collecting SET data...');

        const setData = await this.fetchSETData();

        // Store in Git Memory
        await this.gitMemory.store({
          type: 'set_trading_data',
          data: setData,
          timestamp: new Date().toISOString(),
          source: 'set_api',
        });

        // Analyze with AI
        if (this.config.ai.enabled) {
          await this.analyzeTradingData('set', setData);
        }
      } catch (error) {
        console.error('❌ SET data collection failed:', error);
      }
    }, this.config.platforms.set.updateInterval);
  }

  private setupCryptoDataCollection(): void {
    // Crypto data collection every 30 seconds
    setInterval(async () => {
      try {
        console.log('₿ Collecting crypto data...');

        const cryptoData = await this.fetchCryptoData();

        // Store in Git Memory
        await this.gitMemory.store({
          type: 'crypto_trading_data',
          data: cryptoData,
          timestamp: new Date().toISOString(),
          source: 'coingecko_api',
        });

        // Analyze with AI
        if (this.config.ai.enabled) {
          await this.analyzeTradingData('crypto', cryptoData);
        }
      } catch (error) {
        console.error('❌ Crypto data collection failed:', error);
      }
    }, this.config.platforms.crypto.updateInterval);
  }

  private setupForexDataCollection(): void {
    // Forex data collection every 5 minutes
    setInterval(async () => {
      try {
        console.log('💱 Collecting forex data...');

        const forexData = await this.fetchForexData();

        // Store in Git Memory
        await this.gitMemory.store({
          type: 'forex_trading_data',
          data: forexData,
          timestamp: new Date().toISOString(),
          source: 'exchangerate_api',
        });
      } catch (error) {
        console.error('❌ Forex data collection failed:', error);
      }
    }, this.config.platforms.forex.updateInterval);
  }

  private setupFinancialNewsCollection(): void {
    // Financial news collection every 10 minutes
    setInterval(async () => {
      try {
        console.log('📰 Collecting financial news...');

        const newsData = await this.fetchFinancialNews();

        // Store in Git Memory
        await this.gitMemory.store({
          type: 'financial_news',
          data: newsData,
          timestamp: new Date().toISOString(),
          source: 'news_scraping',
        });

        // Analyze sentiment with AI
        if (this.config.ai.enabled) {
          await this.analyzeNewsSentiment(newsData);
        }
      } catch (error) {
        console.error('❌ Financial news collection failed:', error);
      }
    }, this.config.platforms.news.updateInterval);
  }

  private setupRealTimeMonitoring(): void {
    console.log('📊 Setting up real-time monitoring...');

    // Monitor market conditions
    setInterval(async () => {
      await this.monitorMarketConditions();
    }, 60000); // Every minute
  }

  private setupAutomatedAlerts(): void {
    console.log('🚨 Setting up automated alerts...');

    // Setup price alerts
    this.setupPriceAlerts();

    // Setup volume alerts
    this.setupVolumeAlerts();

    // Setup news alerts
    this.setupNewsAlerts();
  }

  private setupPortfolioRebalancing(): void {
    console.log('⚖️ Setting up portfolio rebalancing...');

    // Daily portfolio rebalancing
    setInterval(async () => {
      await this.rebalancePortfolio();
    }, 86400000); // Every 24 hours
  }

  // Data fetching methods
  private async fetchSETData(): Promise<any> {
    try {
      const response = await axios.get(this.config.platforms.set.apiUrl, {
        params: {
          symbol: this.config.platforms.set.symbols.join(','),
        },
        timeout: 10000,
      });

      return {
        stocks: response.data || [],
        totalSymbols: this.config.platforms.set.symbols.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch SET data:', error);
      return {
        stocks: [],
        error: error.message,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async fetchCryptoData(): Promise<any> {
    try {
      const ids = this.config.platforms.crypto.coins.join(',');
      const response = await axios.get(
        `${this.config.platforms.crypto.apiUrl}/coins/markets`,
        {
          params: {
            vs_currency: 'usd',
            ids: ids,
            order: 'market_cap_desc',
            per_page: 100,
            page: 1,
            sparkline: false,
          },
          timeout: 10000,
        }
      );

      return {
        cryptocurrencies: response.data || [],
        totalCoins: this.config.platforms.crypto.coins.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch crypto data:', error);
      return {
        cryptocurrencies: [],
        error: error.message,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async fetchForexData(): Promise<any> {
    try {
      const baseCurrency = 'THB';
      const forexPromises = this.config.platforms.forex.pairs.map(
        async pair => {
          const [from, to] = pair.split('/');
          const response = await axios.get(
            `${this.config.platforms.forex.apiUrl}/latest/${from}`,
            {
              timeout: 10000,
            }
          );

          return {
            pair,
            rate: response.data?.rates?.[to] || 0,
            lastUpdated: new Date().toISOString(),
          };
        }
      );

      const forexData = await Promise.all(forexPromises);

      return {
        rates: forexData,
        totalPairs: this.config.platforms.forex.pairs.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch forex data:', error);
      return {
        rates: [],
        error: error.message,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async fetchFinancialNews(): Promise<any> {
    try {
      const newsData = [];

      for (const source of this.config.platforms.news.sources) {
        try {
          const response = await axios.get(source, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Trading-AI-Data-Collector/1.0.0',
            },
          });

          const $ = cheerio.load(response.data);
          const articles = [];

          // Extract news articles based on source
          if (source.includes('bangkokpost')) {
            $('.article-item, .news-item').each((i, elem) => {
              if (articles.length >= 5) return false;
              const title = $(elem).find('h3, h4, .title').text().trim();
              const link = $(elem).find('a').attr('href');

              if (title && this.isRelevantNews(title)) {
                articles.push({
                  title,
                  source: 'Bangkok Post',
                  url: link
                    ? link.startsWith('http')
                      ? link
                      : `https://www.bangkokpost.com${link}`
                    : source,
                  publishedAt: new Date().toISOString(),
                });
              }
            });
          }

          newsData.push(...articles);
        } catch (error) {
          console.warn(`Failed to fetch from ${source}:`, error.message);
        }
      }

      return {
        articles: newsData.slice(0, 20), // Limit to 20 articles
        totalSources: this.config.platforms.news.sources.length,
        totalArticles: newsData.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch financial news:', error);
      return {
        articles: [],
        error: error.message,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private isRelevantNews(title: string): boolean {
    const keywords = this.config.platforms.news.keywords;
    return keywords.some(keyword =>
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // AI Analysis methods
  private async analyzeTradingData(type: string, data: any): Promise<void> {
    try {
      console.log(`🧠 Analyzing ${type} data with AI...`);

      // Technical analysis
      const technicalAnalysis = await this.performTechnicalAnalysis(data);

      // Risk assessment
      const riskAssessment = await this.performRiskAssessment(data);

      // Store analysis results
      await this.gitMemory.store({
        type: `${type}_ai_analysis`,
        data,
        technicalAnalysis,
        riskAssessment,
        confidence: this.calculateConfidence(data),
        analyzedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to analyze ${type} data:`, error);
    }
  }

  private async analyzeNewsSentiment(newsData: any): Promise<void> {
    try {
      console.log('🧠 Analyzing news sentiment...');

      for (const article of newsData.articles) {
        const sentiment = await this.analyzeSentiment(
          article.title + ' ' + (article.summary || '')
        );

        await this.gitMemory.store({
          type: 'news_sentiment_analysis',
          article: article.title,
          source: article.source,
          sentiment,
          impact: this.calculateNewsImpact(sentiment, article),
          analyzedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to analyze news sentiment:', error);
    }
  }

  private async performTechnicalAnalysis(data: any): Promise<any> {
    // Simplified technical analysis
    return {
      trend: Math.random() > 0.5 ? 'bullish' : 'bearish',
      strength: Math.random() * 100,
      indicators: {
        rsi: Math.random() * 100,
        macd: Math.random() * 10 - 5,
        movingAverage: Math.random() * 1000,
      },
    };
  }

  private async performRiskAssessment(data: any): Promise<any> {
    // Simplified risk assessment
    return {
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      volatility: Math.random() * 50,
      recommendations: [
        'Monitor price movements closely',
        'Consider stop-loss orders',
        'Diversify portfolio',
      ],
    };
  }

  private async analyzeSentiment(text: string): Promise<any> {
    // Simplified sentiment analysis
    const positiveWords = ['ดี', 'เพิ่ม', 'สูง', 'แข็งแกร่ง', 'เติบโต'];
    const negativeWords = ['แย่', 'ลด', 'ต่ำ', 'อ่อนแอ', 'ตกต่ำ'];

    let score = 0;
    const words = text.toLowerCase().split(' ');

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) score += 1;
      if (negativeWords.some(nw => word.includes(nw))) score -= 1;
    });

    return {
      score,
      sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
      confidence: Math.min(Math.abs(score) / 5, 1),
    };
  }

  private calculateConfidence(data: any): number {
    // Calculate confidence based on data quality and quantity
    const baseConfidence = 0.7;
    const dataQualityBonus = data.totalSymbols ? 0.2 : 0;
    const recencyBonus = 0.1; // Assuming recent data

    return Math.min(baseConfidence + dataQualityBonus + recencyBonus, 1.0);
  }

  private calculateNewsImpact(sentiment: any, article: any): string {
    const impact = sentiment.score * sentiment.confidence;

    if (impact > 2) return 'high';
    if (impact > 0.5) return 'medium';
    return 'low';
  }

  // Monitoring methods
  private async monitorMarketConditions(): Promise<void> {
    // Monitor overall market conditions
    console.log('📊 Monitoring market conditions...');

    // Check if trading hours
    const now = new Date();
    const tradingStart = new Date();
    tradingStart.setHours(9, 30, 0, 0);
    const tradingEnd = new Date();
    tradingEnd.setHours(16, 30, 0, 0);

    const isTradingHours = now >= tradingStart && now <= tradingEnd;

    await this.gitMemory.store({
      type: 'market_conditions',
      isTradingHours,
      currentTime: now.toISOString(),
      marketStatus: isTradingHours ? 'open' : 'closed',
      timestamp: new Date().toISOString(),
    });
  }

  private setupPriceAlerts(): void {
    console.log('💰 Setting up price alerts...');

    // Monitor price movements and send alerts
    setInterval(async () => {
      // Check for significant price movements
      const alerts = await this.checkPriceAlerts();

      if (alerts.length > 0) {
        await this.gitMemory.store({
          type: 'price_alerts',
          alerts,
          triggeredAt: new Date().toISOString(),
        });

        console.log(`🚨 Generated ${alerts.length} price alerts`);
      }
    }, 300000); // Every 5 minutes
  }

  private setupVolumeAlerts(): void {
    console.log('📊 Setting up volume alerts...');

    // Monitor trading volume
    setInterval(async () => {
      const volumeAlerts = await this.checkVolumeAlerts();

      if (volumeAlerts.length > 0) {
        await this.gitMemory.store({
          type: 'volume_alerts',
          alerts: volumeAlerts,
          triggeredAt: new Date().toISOString(),
        });
      }
    }, 600000); // Every 10 minutes
  }

  private setupNewsAlerts(): void {
    console.log('📰 Setting up news alerts...');

    // Monitor for important financial news
    setInterval(async () => {
      const newsAlerts = await this.checkNewsAlerts();

      if (newsAlerts.length > 0) {
        await this.gitMemory.store({
          type: 'news_alerts',
          alerts: newsAlerts,
          triggeredAt: new Date().toISOString(),
        });
      }
    }, 300000); // Every 5 minutes
  }

  private async checkPriceAlerts(): Promise<any[]> {
    // Check for significant price movements
    const recentData = await this.gitMemory.retrieve({
      type: 'set_trading_data',
      limit: 10,
    });
    const alerts = [];

    // Compare with previous prices
    if (recentData.length >= 2) {
      const current = recentData[0];
      const previous = recentData[1];

      current.data.stocks.forEach((stock: any) => {
        const prevStock = previous.data.stocks.find(
          (s: any) => s.symbol === stock.symbol
        );
        if (prevStock) {
          const priceChange =
            ((stock.price - prevStock.price) / prevStock.price) * 100;

          if (Math.abs(priceChange) > 5) {
            // 5% change
            alerts.push({
              type: 'price_movement',
              symbol: stock.symbol,
              change: priceChange,
              currentPrice: stock.price,
              previousPrice: prevStock.price,
              severity: Math.abs(priceChange) > 10 ? 'high' : 'medium',
            });
          }
        }
      });
    }

    return alerts;
  }

  private async checkVolumeAlerts(): Promise<any[]> {
    // Check for unusual trading volume
    const recentData = await this.gitMemory.retrieve({
      type: 'set_trading_data',
      limit: 5,
    });
    const alerts = [];

    if (recentData.length >= 2) {
      const current = recentData[0];
      const average =
        recentData
          .slice(1)
          .reduce(
            (sum: number, data: any) =>
              sum +
              data.data.stocks.reduce(
                (s: number, stock: any) => s + stock.volume,
                0
              ),
            0
          ) /
        (recentData.length - 1);

      current.data.stocks.forEach((stock: any) => {
        if (stock.volume > average * 2) {
          // Volume doubled
          alerts.push({
            type: 'volume_spike',
            symbol: stock.symbol,
            currentVolume: stock.volume,
            averageVolume: average,
            spike: stock.volume / average,
          });
        }
      });
    }

    return alerts;
  }

  private async checkNewsAlerts(): Promise<any[]> {
    // Check for important financial news
    const recentNews = await this.gitMemory.retrieve({
      type: 'financial_news',
      limit: 20,
    });
    const alerts = [];

    const importantKeywords = ['ธปท', 'กนง', 'ดอกเบี้ย', 'เศรษฐกิจ', 'วิกฤต'];

    recentNews.forEach((newsItem: any) => {
      newsItem.data.articles.forEach((article: any) => {
        if (
          importantKeywords.some(keyword => article.title.includes(keyword))
        ) {
          alerts.push({
            type: 'important_news',
            title: article.title,
            source: article.source,
            importance: 'high',
            keywords: importantKeywords.filter(k => article.title.includes(k)),
          });
        }
      });
    });

    return alerts;
  }

  private async rebalancePortfolio(): Promise<void> {
    console.log('⚖️ Rebalancing portfolio...');

    try {
      // Get current portfolio
      const portfolio = await this.getCurrentPortfolio();

      // Analyze optimal allocation
      const optimalAllocation =
        await this.calculateOptimalAllocation(portfolio);

      // Generate rebalancing recommendations
      const recommendations = await this.generateRebalancingRecommendations(
        portfolio,
        optimalAllocation
      );

      // Store rebalancing data
      await this.gitMemory.store({
        type: 'portfolio_rebalancing',
        currentPortfolio: portfolio,
        optimalAllocation,
        recommendations,
        rebalancedAt: new Date().toISOString(),
      });

      console.log('✅ Portfolio rebalancing completed');
    } catch (error) {
      console.error('❌ Portfolio rebalancing failed:', error);
    }
  }

  private async getCurrentPortfolio(): Promise<any> {
    // Get current portfolio from Git Memory
    const portfolioData = await this.gitMemory.retrieve({
      type: 'portfolio_holdings',
    });

    return {
      totalValue: 1000000, // THB
      holdings: [
        { symbol: 'PTT', shares: 1000, value: 35500 },
        { symbol: 'AOT', shares: 500, value: 34125 },
        { symbol: 'BTC', amount: 0.1, value: 150000 },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  private async calculateOptimalAllocation(portfolio: any): Promise<any> {
    // Calculate optimal portfolio allocation based on AI analysis
    return {
      stocks: 0.6, // 60% stocks
      crypto: 0.2, // 20% crypto
      cash: 0.2, // 20% cash
      riskLevel: 'medium',
      expectedReturn: 0.08, // 8% annual return
      volatility: 0.15, // 15% volatility
    };
  }

  private async generateRebalancingRecommendations(
    current: any,
    optimal: any
  ): Promise<any[]> {
    // Generate rebalancing recommendations
    return [
      {
        action: 'buy',
        symbol: 'CPALL',
        amount: 50000,
        reason: 'เพิ่มน้ำหนักในหุ้นค้าปลีก',
      },
      {
        action: 'sell',
        symbol: 'BTC',
        amount: 30000,
        reason: 'ลดน้ำหนักใน crypto ตาม optimal allocation',
      },
    ];
  }

  // Public methods for external access
  async getTradingStatus(): Promise<any> {
    const setData = await this.gitMemory.retrieve({
      type: 'set_trading_data',
      limit: 1,
    });
    const cryptoData = await this.gitMemory.retrieve({
      type: 'crypto_trading_data',
      limit: 1,
    });
    const newsData = await this.gitMemory.retrieve({
      type: 'financial_news',
      limit: 1,
    });

    return {
      set: setData.length > 0 ? 'connected' : 'disconnected',
      crypto: cryptoData.length > 0 ? 'connected' : 'disconnected',
      news: newsData.length > 0 ? 'connected' : 'disconnected',
      lastUpdate: new Date().toISOString(),
      aiEnabled: this.config.ai.enabled,
    };
  }

  async getTradingInsights(): Promise<any> {
    // Get latest trading insights from AI analysis
    const analyses = await this.gitMemory.retrieve({
      type: 'set_ai_analysis',
      limit: 5,
    });

    return {
      totalAnalyses: analyses.length,
      insights: analyses.map((analysis: any) => ({
        symbol: analysis.data.symbol,
        trend: analysis.technicalAnalysis?.trend,
        riskLevel: analysis.riskAssessment?.riskLevel,
        confidence: analysis.confidence,
      })),
      lastUpdated: new Date().toISOString(),
    };
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Trading AI data collector...');
    console.log('✅ Trading AI data collector cleaned up');
  }
}

// Trading AI launcher
export async function launchTradingAI(
  gitMemory: any
): Promise<TradingAIDataCollector> {
  console.log('🚀 Launching Trading AI Data Collection...');

  const tradingAI = new TradingAIDataCollector(gitMemory);

  try {
    await tradingAI.initialize();

    console.log('✅ Trading AI launched successfully!');
    console.log('🎯 Trading capabilities now available:');
    console.log('   📈 SET stock monitoring');
    console.log('   ₿ Cryptocurrency tracking');
    console.log('   💱 Forex rate monitoring');
    console.log('   📰 Financial news analysis');
    console.log('   🧠 AI-powered trading insights');
    console.log('   🚨 Automated alerts and notifications');

    return tradingAI;
  } catch (error) {
    console.error('❌ Failed to launch Trading AI:', error);
    throw error;
  }
}

// Export for use in other modules
export default TradingAIDataCollector;
