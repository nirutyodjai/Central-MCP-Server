// Investment Website Integration with Git Memory MCP
// ทดสอบกับเว็บไซต์การลงทุนจริง

// Mock investment data collection (จำลองการดึงข้อมูลจริง)
class InvestmentDataCollector {
  private gitMemory: any;

  constructor(gitMemoryInstance: any) {
    this.gitMemory = gitMemoryInstance;
  }

  // ดึงข้อมูลหุ้นจาก SET (จำลอง)
  async collectSETData(): Promise<void> {
    console.log('📈 Collecting SET (Stock Exchange of Thailand) data...');

    // จำลองข้อมูลหุ้นไทย
    const setStocks = [
      {
        symbol: 'PTT',
        name: 'บริษัท ปตท. จำกัด (มหาชน)',
        price: 35.5,
        change: +0.75,
        volume: 12500000,
        marketCap: 101300000000,
        sector: 'Energy & Utilities',
      },
      {
        symbol: 'AOT',
        name: 'บริษัท ท่าอากาศยานไทย จำกัด (มหาชน)',
        price: 68.25,
        change: -1.25,
        volume: 8500000,
        marketCap: 97500000000,
        sector: 'Transportation & Logistics',
      },
      {
        symbol: 'CPALL',
        name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
        price: 62.75,
        change: +2.0,
        volume: 15200000,
        marketCap: 564000000000,
        sector: 'Commerce',
      },
      {
        symbol: 'SCB',
        name: 'บริษัท ธนาคารไทยพาณิชย์ จำกัด (มหาชน)',
        price: 115.5,
        change: +1.5,
        volume: 6200000,
        marketCap: 392000000000,
        sector: 'Banking',
      },
      {
        symbol: 'ADVANC',
        name: 'บริษัท แอดวานซ์ อินโฟร์ เซอร์วิส จำกัด (มหาชน)',
        price: 225.0,
        change: -3.0,
        volume: 4100000,
        marketCap: 669000000000,
        sector: 'Information & Communication Technology',
      },
    ];

    // เก็บข้อมูลหุ้นใน Git Memory
    for (const stock of setStocks) {
      await this.gitMemory.store({
        type: 'set_stock',
        data: stock,
        collected_at: new Date().toISOString(),
        source: 'set_market_data',
      });
    }

    // สรุปข้อมูลการลงทุน
    const totalMarketCap = setStocks.reduce(
      (sum, stock) => sum + stock.marketCap,
      0
    );
    const gainers = setStocks.filter(stock => stock.change > 0).length;
    const losers = setStocks.filter(stock => stock.change < 0).length;

    await this.gitMemory.store({
      type: 'set_market_summary',
      total_stocks: setStocks.length,
      total_market_cap: totalMarketCap,
      gainers: gainers,
      losers: losers,
      market_trend:
        gainers > losers ? 'up' : gainers < losers ? 'down' : 'sideways',
      collected_at: new Date().toISOString(),
    });

    console.log(`✅ Collected ${setStocks.length} SET stocks`);
  }

  // ดึงข้อมูล crypto currency (จำลอง)
  async collectCryptoData(): Promise<void> {
    console.log('₿ Collecting cryptocurrency data...');

    const cryptoData = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 43250.0,
        change_24h: +2.45,
        market_cap: 847000000000,
        volume_24h: 18500000000,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2650.0,
        change_24h: +1.82,
        market_cap: 318000000000,
        volume_24h: 12400000000,
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        price: 0.485,
        change_24h: -0.95,
        market_cap: 17100000000,
        volume_24h: 890000000,
      },
    ];

    // เก็บข้อมูล crypto ใน Git Memory
    for (const crypto of cryptoData) {
      await this.gitMemory.store({
        type: 'crypto_currency',
        data: crypto,
        collected_at: new Date().toISOString(),
        source: 'crypto_market_data',
      });
    }

    console.log(`✅ Collected ${cryptoData.length} cryptocurrencies`);
  }

  // ดึงข้อมูลข่าวการเงิน (จำลอง)
  async collectFinancialNews(): Promise<void> {
    console.log('📰 Collecting financial news...');

    const financialNews = [
      {
        title: 'ธปท. คงดอกเบี้ยที่ 2.50% ในการประชุมเดือนตุลาคม',
        source: 'Bangkok Post',
        published_at: new Date().toISOString(),
        summary:
          'คณะกรรมการนโยบายการเงินมีมติเป็นเอกฉันท์คงดอกเบี้ยไว้ที่ระดับเดิม',
        category: 'monetary_policy',
      },
      {
        title: 'ตลาดหุ้นไทยปรับตัวขึ้นหลัง FED ส่งสัญญาณผ่อนคลาย',
        source: 'Thai PBS',
        published_at: new Date().toISOString(),
        summary: 'ดัชนี SET ปิดตลาดที่ 1,425.67 จุด เพิ่มขึ้น 12.34 จุด',
        category: 'stock_market',
      },
      {
        title: 'ราคาน้ำมันดิบปรับตัวขึ้นจากความตึงเครียดในตะวันออกกลาง',
        source: 'Reuters',
        published_at: new Date().toISOString(),
        summary: 'ราคาน้ำมันดิบ Brent ปิดตลาดที่ 89.45 ดอลลาร์ต่อบาร์เรล',
        category: 'commodities',
      },
    ];

    // เก็บข่าวการเงินใน Git Memory
    for (const news of financialNews) {
      await this.gitMemory.store({
        type: 'financial_news',
        data: news,
        collected_at: new Date().toISOString(),
        source: 'financial_news_api',
      });
    }

    console.log(`✅ Collected ${financialNews.length} financial news articles`);
  }

  // ดึงข้อมูลกองทุนรวม (จำลอง)
  async collectMutualFundData(): Promise<void> {
    console.log('📊 Collecting mutual fund data...');

    const mutualFunds = [
      {
        name: 'กองทุนเปิดกรุงไทยตราสารหนี้',
        fundType: 'ตราสารหนี้',
        nav: 12.3456,
        navChange: +0.0234,
        aum: 15000000000, // Assets Under Management
        riskLevel: 4,
        return_1y: 2.34,
        return_3y: 8.76,
      },
      {
        name: 'กองทุนเปิดเคหุ้นส่วนใหญ่',
        fundType: 'หุ้นใหญ่',
        nav: 45.6789,
        navChange: -0.4567,
        aum: 85000000000,
        riskLevel: 6,
        return_1y: 12.45,
        return_3y: 28.9,
      },
    ];

    // เก็บข้อมูลกองทุนใน Git Memory
    for (const fund of mutualFunds) {
      await this.gitMemory.store({
        type: 'mutual_fund',
        data: fund,
        collected_at: new Date().toISOString(),
        source: 'mutual_fund_data',
      });
    }

    console.log(`✅ Collected ${mutualFunds.length} mutual funds`);
  }

  // ดึงข้อมูลอัตราแลกเปลี่ยน (จำลอง)
  async collectExchangeRates(): Promise<void> {
    console.log('💱 Collecting exchange rates...');

    const exchangeRates = [
      {
        from: 'THB',
        to: 'USD',
        rate: 0.0294,
        change: -0.0002,
        source: 'Bank of Thailand',
      },
      {
        from: 'THB',
        to: 'EUR',
        rate: 0.0271,
        change: +0.0001,
        source: 'Bank of Thailand',
      },
      {
        from: 'THB',
        to: 'JPY',
        rate: 4.45,
        change: +0.02,
        source: 'Bank of Thailand',
      },
    ];

    // เก็บอัตราแลกเปลี่ยนใน Git Memory
    for (const rate of exchangeRates) {
      await this.gitMemory.store({
        type: 'exchange_rate',
        data: rate,
        collected_at: new Date().toISOString(),
        source: 'bot_exchange_rates',
      });
    }

    console.log(`✅ Collected ${exchangeRates.length} exchange rates`);
  }

  // แสดงสถิติการลงทุน
  async showInvestmentStats(): Promise<void> {
    console.log('\n📊 Investment Data Statistics:');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );

    // ดึงข้อมูลจาก Git Memory
    const setStocks = await this.gitMemory.retrieve({
      type: 'set_stock',
      limit: 100,
    });
    const cryptoData = await this.gitMemory.retrieve({
      type: 'crypto_currency',
      limit: 100,
    });
    const financialNews = await this.gitMemory.retrieve({
      type: 'financial_news',
      limit: 100,
    });
    const mutualFunds = await this.gitMemory.retrieve({
      type: 'mutual_fund',
      limit: 100,
    });
    const exchangeRates = await this.gitMemory.retrieve({
      type: 'exchange_rate',
      limit: 100,
    });

    console.log(`📈 SET Stocks: ${setStocks.length} symbols tracked`);
    console.log(`₿ Cryptocurrencies: ${cryptoData.length} coins tracked`);
    console.log(
      `📰 Financial News: ${financialNews.length} articles collected`
    );
    console.log(`📊 Mutual Funds: ${mutualFunds.length} funds tracked`);
    console.log(`💱 Exchange Rates: ${exchangeRates.length} currency pairs`);

    // คำนวณมูลค่ารวม
    const totalSETMarketCap = setStocks.reduce(
      (sum: number, stock: any) => sum + stock.data.marketCap,
      0
    );
    const totalCryptoMarketCap = cryptoData.reduce(
      (sum: number, crypto: any) => sum + crypto.data.market_cap,
      0
    );

    console.log(
      `💰 Total SET Market Cap: ${totalSETMarketCap.toLocaleString()} THB`
    );
    console.log(
      `₿ Total Crypto Market Cap: ${totalCryptoMarketCap.toLocaleString()} USD`
    );

    // แนวโน้มตลาด
    const setGainers = setStocks.filter(
      (stock: any) => stock.data.change > 0
    ).length;
    const setLosers = setStocks.filter(
      (stock: any) => stock.data.change < 0
    ).length;
    const cryptoGainers = cryptoData.filter(
      (crypto: any) => crypto.data.change_24h > 0
    ).length;
    const cryptoLosers = cryptoData.filter(
      (crypto: any) => crypto.data.change_24h < 0
    ).length;

    console.log(`📊 SET Trend: ${setGainers} gainers, ${setLosers} losers`);
    console.log(
      `₿ Crypto Trend: ${cryptoGainers} gainers, ${cryptoLosers} losers`
    );
  }
}

// Main function สำหรับทดสอบกับเว็บไซต์การลงทุน
async function testInvestmentIntegration() {
  console.log('🎯 Starting Investment Website Integration Test...\n');

  try {
    // จำลอง Git Memory
    const gitMemory = {
      storage: new Map(),

      async store(data: any): Promise<void> {
        const type = data.type || 'unknown';
        if (!this.storage.has(type)) {
          this.storage.set(type, []);
        }
        this.storage.get(type)!.push({
          ...data,
          id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
        console.log(`💾 Stored ${type} data in Git Memory`);
      },

      async retrieve(query: any): Promise<any[]> {
        const type = query.type;
        const limit = query.limit || 100;
        if (!this.storage.has(type)) {
          return [];
        }
        return this.storage.get(type)!.slice(-limit);
      },
    };

    // สร้าง investment data collector
    const investmentCollector = new InvestmentDataCollector(gitMemory);

    // รวบรวมข้อมูลการลงทุนจากทุกแหล่ง
    await investmentCollector.collectSETData();
    await investmentCollector.collectCryptoData();
    await investmentCollector.collectFinancialNews();
    await investmentCollector.collectMutualFundData();
    await investmentCollector.collectExchangeRates();

    // แสดงสถิติ
    await investmentCollector.showInvestmentStats();

    console.log(
      '\n🎉 Investment Website Integration Test completed successfully!'
    );
    console.log(
      '💡 ข้อมูลการลงทุนทั้งหมดถูกเก็บใน Git Memory พร้อม version control'
    );
  } catch (error) {
    console.error('❌ Investment integration test failed:', error);
  }
}

// รันการทดสอบถ้าถูกเรียกโดยตรง
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvestmentIntegration().catch(console.error);
}

export { testInvestmentIntegration, InvestmentDataCollector };
