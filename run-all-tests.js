/**
 * ไฟล์รันการทดสอบทั้งหมดสำหรับ Central MCP Server
 * Main test runner for all Central MCP Server tests
 */

const { runAllTests } = require('./test-example');
const { runPerformanceTests } = require('./performance-test');
const { runSecurityTests } = require('./security-test');
const { runUITests } = require('./ui-test');

// กำหนดค่าเริ่มต้น
const TEST_CONFIG = {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    adminToken: process.env.ADMIN_TOKEN || 'your-admin-token-here',
    serverToken: process.env.SERVER_TOKEN || 'your-server-token-here',
    timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
    skipPerformance: process.env.SKIP_PERFORMANCE === 'true',
    skipSecurity: process.env.SKIP_SECURITY === 'true',
    skipUI: process.env.SKIP_UI === 'true'
};

// สถิติการทดสอบรวม
let overallStats = {
    startTime: null,
    endTime: null,
    totalDuration: 0,
    testSuites: {
        functional: { status: 'pending', duration: 0, error: null },
        performance: { status: 'pending', duration: 0, error: null },
        security: { status: 'pending', duration: 0, error: null },
        ui: { status: 'pending', duration: 0, error: null }
    },
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    }
};

// ฟังก์ชันสำหรับแสดงข้อมูลการกำหนดค่า
function displayConfiguration() {
    console.log('⚙️ การกำหนดค่าการทดสอบ:');
    console.log('=' .repeat(50));
    console.log(`🌐 Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`⏱️ Timeout: ${TEST_CONFIG.timeout}ms`);
    console.log(`🔑 Admin Token: ${TEST_CONFIG.adminToken !== 'your-admin-token-here' ? '✅ กำหนดแล้ว' : '❌ ยังไม่ได้กำหนด'}`);
    console.log(`🔐 Server Token: ${TEST_CONFIG.serverToken !== 'your-server-token-here' ? '✅ กำหนดแล้ว' : '❌ ยังไม่ได้กำหนด'}`);
    console.log(`🚀 Performance Tests: ${TEST_CONFIG.skipPerformance ? '❌ ข้าม' : '✅ รัน'}`);
    console.log(`🛡️ Security Tests: ${TEST_CONFIG.skipSecurity ? '❌ ข้าม' : '✅ รัน'}`);
    console.log(`🖥️ UI Tests: ${TEST_CONFIG.skipUI ? '❌ ข้าม' : '✅ รัน'}`);
    console.log('');
}

// ฟังก์ชันสำหรับรันการทดสอบแต่ละประเภท
async function runTestSuite(suiteName, testFunction, skipCondition = false) {
    if (skipCondition) {
        console.log(`⏭️ ข้ามการทดสอบ ${suiteName}`);
        overallStats.testSuites[suiteName.toLowerCase()].status = 'skipped';
        overallStats.summary.skipped++;
        return;
    }
    
    console.log(`\n🚀 เริ่มการทดสอบ ${suiteName}...`);
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
        await testFunction();
        const duration = Date.now() - startTime;
        
        overallStats.testSuites[suiteName.toLowerCase()].status = 'completed';
        overallStats.testSuites[suiteName.toLowerCase()].duration = duration;
        overallStats.summary.passed++;
        
        console.log(`\n✅ การทดสอบ ${suiteName} เสร็จสิ้น (${duration}ms)`);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        overallStats.testSuites[suiteName.toLowerCase()].status = 'failed';
        overallStats.testSuites[suiteName.toLowerCase()].duration = duration;
        overallStats.testSuites[suiteName.toLowerCase()].error = error.message;
        overallStats.summary.failed++;
        
        console.error(`\n❌ การทดสอบ ${suiteName} ล้มเหลว (${duration}ms):`, error.message);
    }
}

// ฟังก์ชันตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์
async function checkServerConnection() {
    console.log('🔍 ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์...');
    
    try {
        const axios = require('axios');
        const response = await axios.get(`${TEST_CONFIG.baseUrl}/health`, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log('✅ เซิร์ฟเวอร์ทำงานปกติ');
            return true;
        } else {
            console.log(`❌ เซิร์ฟเวอร์ส่งคืน status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${error.message}`);
        return false;
    }
}

// ฟังก์ชันแสดงสรุปผลการทดสอบรวม
function displayOverallSummary() {
    console.log('\n\n📊 สรุปผลการทดสอบทั้งหมด:');
    console.log('=' .repeat(70));
    
    // แสดงเวลาที่ใช้
    console.log(`⏱️ เวลาที่ใช้ทั้งหมด: ${overallStats.totalDuration}ms (${(overallStats.totalDuration / 1000).toFixed(2)}s)`);
    console.log(`🕐 เริ่มเวลา: ${overallStats.startTime}`);
    console.log(`🕐 สิ้นสุดเวลา: ${overallStats.endTime}`);
    
    console.log('\n📋 ผลการทดสอบแต่ละประเภท:');
    
    // แสดงผลแต่ละ test suite
    Object.entries(overallStats.testSuites).forEach(([suite, data]) => {
        const statusIcon = {
            'completed': '✅',
            'failed': '❌',
            'skipped': '⏭️',
            'pending': '⏳'
        }[data.status] || '❓';
        
        console.log(`${statusIcon} ${suite.toUpperCase()}: ${data.status} (${data.duration}ms)`);
        if (data.error) {
            console.log(`   ❌ ข้อผิดพลาด: ${data.error}`);
        }
    });
    
    // แสดงสถิติรวม
    console.log('\n📈 สถิติรวม:');
    console.log(`✅ ผ่าน: ${overallStats.summary.passed}`);
    console.log(`❌ ล้มเหลว: ${overallStats.summary.failed}`);
    console.log(`⏭️ ข้าม: ${overallStats.summary.skipped}`);
    console.log(`📊 รวม: ${overallStats.summary.total}`);
    
    const successRate = overallStats.summary.total > 0 
        ? ((overallStats.summary.passed / overallStats.summary.total) * 100).toFixed(2)
        : 0;
    console.log(`🎯 อัตราความสำเร็จ: ${successRate}%`);
    
    // คำแนะนำ
    console.log('\n💡 คำแนะนำ:');
    if (overallStats.summary.failed === 0) {
        console.log('- ระบบทำงานได้ดีทุกด้าน! 🎉');
    } else {
        console.log('- ควรตรวจสอบและแก้ไขปัญหาที่พบ');
        if (overallStats.testSuites.functional.status === 'failed') {
            console.log('- ตรวจสอบการทำงานพื้นฐานของระบบ');
        }
        if (overallStats.testSuites.performance.status === 'failed') {
            console.log('- ปรับปรุงประสิทธิภาพของระบบ');
        }
        if (overallStats.testSuites.security.status === 'failed') {
            console.log('- เสริมความปลอดภัยของระบบ');
        }
        if (overallStats.testSuites.ui.status === 'failed') {
            console.log('- ปรับปรุง UI และ Dashboard');
        }
    }
    
    // แสดงข้อมูลสำหรับ CI/CD
    console.log('\n🤖 สำหรับ CI/CD:');
    console.log(`Exit Code: ${overallStats.summary.failed > 0 ? 1 : 0}`);
}

// ฟังก์ชันสำหรับบันทึกผลการทดสอบเป็นไฟล์ JSON
function saveTestResults() {
    const fs = require('fs');
    const path = require('path');
    
    const resultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(resultsDir, `test-results-${timestamp}.json`);
    
    try {
        fs.writeFileSync(resultsFile, JSON.stringify(overallStats, null, 2));
        console.log(`\n💾 ผลการทดสอบถูกบันทึกที่: ${resultsFile}`);
    } catch (error) {
        console.error(`❌ ไม่สามารถบันทึกผลการทดสอบได้: ${error.message}`);
    }
}

// ฟังก์ชันหลักสำหรับรันการทดสอบทั้งหมด
async function runAllTestSuites() {
    console.log('🚀 เริ่มต้นการทดสอบ Central MCP Server ทั้งหมด\n');
    
    // บันทึกเวลาเริ่มต้น
    overallStats.startTime = new Date().toISOString();
    const startTime = Date.now();
    
    // แสดงการกำหนดค่า
    displayConfiguration();
    
    // ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์
    const serverConnected = await checkServerConnection();
    if (!serverConnected) {
        console.log('\n❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่');
        console.log('💡 เริ่มเซิร์ฟเวอร์ด้วยคำสั่ง: npm start');
        process.exit(1);
    }
    
    // กำหนดจำนวน test suites ทั้งหมด
    overallStats.summary.total = 4 - 
        (TEST_CONFIG.skipPerformance ? 1 : 0) - 
        (TEST_CONFIG.skipSecurity ? 1 : 0) - 
        (TEST_CONFIG.skipUI ? 1 : 0);
    
    try {
        // รันการทดสอบแต่ละประเภท
        await runTestSuite('Functional', runAllTests);
        await runTestSuite('Performance', runPerformanceTests, TEST_CONFIG.skipPerformance);
        await runTestSuite('Security', runSecurityTests, TEST_CONFIG.skipSecurity);
        await runTestSuite('UI', runUITests, TEST_CONFIG.skipUI);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการรันการทดสอบ:', error.message);
    }
    
    // บันทึกเวลาสิ้นสุด
    overallStats.endTime = new Date().toISOString();
    overallStats.totalDuration = Date.now() - startTime;
    
    // แสดงสรุปผล
    displayOverallSummary();
    
    // บันทึกผลการทดสอบ
    saveTestResults();
    
    console.log('\n🎉 การทดสอบทั้งหมดเสร็จสิ้น!');
    
    // Exit ด้วย code ที่เหมาะสม
    process.exit(overallStats.summary.failed > 0 ? 1 : 0);
}

// ฟังก์ชันสำหรับแสดงความช่วยเหลือ
function showHelp() {
    console.log('🔧 วิธีใช้งาน Central MCP Server Test Runner\n');
    console.log('การรันการทดสอบ:');
    console.log('  node run-all-tests.js                 # รันการทดสอบทั้งหมด');
    console.log('  npm run test:all                      # รันการทดสอบทั้งหมด (ถ้ามี script)');
    console.log('');
    console.log('Environment Variables:');
    console.log('  BASE_URL=http://localhost:3000        # URL ของเซิร์ฟเวอร์');
    console.log('  ADMIN_TOKEN=your-token                # Admin token สำหรับ authentication');
    console.log('  SERVER_TOKEN=your-token               # Server token สำหรับ authentication');
    console.log('  TEST_TIMEOUT=30000                    # Timeout สำหรับการทดสอบ (ms)');
    console.log('  SKIP_PERFORMANCE=true                 # ข้ามการทดสอบประสิทธิภาพ');
    console.log('  SKIP_SECURITY=true                    # ข้ามการทดสอบความปลอดภัย');
    console.log('  SKIP_UI=true                          # ข้ามการทดสอบ UI');
    console.log('');
    console.log('ตัวอย่างการใช้งาน:');
    console.log('  BASE_URL=http://localhost:3000 ADMIN_TOKEN=abc123 node run-all-tests.js');
    console.log('  SKIP_PERFORMANCE=true SKIP_SECURITY=true node run-all-tests.js');
    console.log('');
    console.log('การรันการทดสอบแยกประเภท:');
    console.log('  node test-example.js                  # การทดสอบพื้นฐาน');
    console.log('  node performance-test.js              # การทดสอบประสิทธิภาพ');
    console.log('  node security-test.js                 # การทดสอบความปลอดภัย');
    console.log('  node ui-test.js                       # การทดสอบ UI');
}

// ตรวจสอบ command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// รันการทดสอบถ้าไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
    runAllTestSuites().catch(error => {
        console.error('❌ เกิดข้อผิดพลาดร้ายแรง:', error.message);
        process.exit(1);
    });
}

module.exports = {
    runAllTestSuites,
    displayConfiguration,
    checkServerConnection,
    displayOverallSummary,
    saveTestResults,
    showHelp,
    TEST_CONFIG,
    overallStats
};