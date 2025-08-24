/**
 * ไฟล์ทดสอบประสิทธิภาพสำหรับ Central MCP Server
 * Performance test file for Central MCP Server
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// กำหนดค่าเริ่มต้น
const BASE_URL = 'http://localhost:3000';
const CONCURRENT_REQUESTS = 10;
const TEST_DURATION = 30000; // 30 วินาที

// สถิติการทดสอบ
let stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    errors: []
};

// ฟังก์ชันสำหรับวัดเวลาการตอบสนอง
async function measureResponseTime(url, method = 'GET', data = null) {
    const startTime = performance.now();
    try {
        const config = {
            method,
            url,
            timeout: 5000
        };
        
        if (data && method !== 'GET') {
            config.data = data;
        }
        
        const response = await axios(config);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // อัพเดทสถิติ
        stats.totalRequests++;
        stats.successfulRequests++;
        stats.totalResponseTime += responseTime;
        stats.minResponseTime = Math.min(stats.minResponseTime, responseTime);
        stats.maxResponseTime = Math.max(stats.maxResponseTime, responseTime);
        
        return {
            success: true,
            responseTime,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        stats.totalRequests++;
        stats.failedRequests++;
        stats.errors.push({
            url,
            method,
            error: error.message,
            responseTime
        });
        
        return {
            success: false,
            responseTime,
            error: error.message
        };
    }
}

// ทดสอบการโหลดหน้า Health Check
async function loadTestHealthCheck(duration = 10000) {
    console.log(`🏥 เริ่มทดสอบ Health Check เป็นเวลา ${duration/1000} วินาที...`);
    
    const startTime = Date.now();
    const promises = [];
    
    while (Date.now() - startTime < duration) {
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            promises.push(measureResponseTime(`${BASE_URL}/health`));
        }
        
        // รอให้คำขอทั้งหมดเสร็จสิ้น
        await Promise.all(promises.splice(0, CONCURRENT_REQUESTS));
        
        // หน่วงเวลาเล็กน้อย
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ ทดสอบ Health Check เสร็จสิ้น');
}

// ทดสอบการลงทะเบียน MCP Server แบบ concurrent
async function loadTestServerRegistration(count = 50) {
    console.log(`📝 เริ่มทดสอบการลงทะเบียน ${count} เซิร์ฟเวอร์...`);
    
    const promises = [];
    const registeredServers = [];
    
    for (let i = 0; i < count; i++) {
        const testServer = {
            name: `test-server-${i}`,
            url: `http://localhost:${8080 + i}`,
            capabilities: ['chat', 'completion'],
            metadata: {
                version: '1.0.0',
                description: `Test Server ${i}`
            }
        };
        
        promises.push(
            measureResponseTime(
                `${BASE_URL}/api/servers/register`,
                'POST',
                testServer
            ).then(result => {
                if (result.success && result.data.id) {
                    registeredServers.push(result.data.id);
                }
                return result;
            })
        );
    }
    
    await Promise.all(promises);
    console.log(`✅ ลงทะเบียนเสร็จสิ้น (สำเร็จ: ${registeredServers.length}/${count})`);
    
    return registeredServers;
}

// ทดสอบการดึงรายการ MCP Servers แบบ concurrent
async function loadTestGetServers(duration = 5000) {
    console.log(`📋 เริ่มทดสอบการดึงรายการเซิร์ฟเวอร์เป็นเวลา ${duration/1000} วินาที...`);
    
    const startTime = Date.now();
    const promises = [];
    
    while (Date.now() - startTime < duration) {
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            promises.push(measureResponseTime(`${BASE_URL}/api/servers`));
        }
        
        await Promise.all(promises.splice(0, CONCURRENT_REQUESTS));
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('✅ ทดสอบการดึงรายการเสร็จสิ้น');
}

// ทดสอบ Service Discovery แบบ concurrent
async function loadTestServiceDiscovery(duration = 5000) {
    console.log(`🔍 เริ่มทดสอบ Service Discovery เป็นเวลา ${duration/1000} วินาที...`);
    
    const capabilities = ['chat', 'completion', 'search', 'analysis'];
    const startTime = Date.now();
    const promises = [];
    
    while (Date.now() - startTime < duration) {
        for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
            const capability = capabilities[i % capabilities.length];
            promises.push(
                measureResponseTime(`${BASE_URL}/api/discovery/capabilities/${capability}`)
            );
        }
        
        await Promise.all(promises.splice(0, CONCURRENT_REQUESTS));
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('✅ ทดสอบ Service Discovery เสร็จสิ้น');
}

// ทำความสะอาดเซิร์ฟเวอร์ที่ลงทะเบียนไว้
async function cleanupServers(serverIds) {
    console.log(`🗑️ ทำความสะอาดเซิร์ฟเวอร์ ${serverIds.length} ตัว...`);
    
    const promises = serverIds.map(id => 
        measureResponseTime(`${BASE_URL}/api/servers/${id}`, 'DELETE')
    );
    
    await Promise.all(promises);
    console.log('✅ ทำความสะอาดเสร็จสิ้น');
}

// แสดงสถิติการทดสอบ
function displayStats() {
    console.log('\n📊 สถิติการทดสอบประสิทธิภาพ:');
    console.log('=' .repeat(50));
    console.log(`📈 คำขอทั้งหมด: ${stats.totalRequests}`);
    console.log(`✅ คำขอสำเร็จ: ${stats.successfulRequests}`);
    console.log(`❌ คำขอล้มเหลว: ${stats.failedRequests}`);
    console.log(`📊 อัตราความสำเร็จ: ${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%`);
    
    if (stats.successfulRequests > 0) {
        const avgResponseTime = stats.totalResponseTime / stats.successfulRequests;
        console.log(`⏱️ เวลาตอบสนองเฉลี่ย: ${avgResponseTime.toFixed(2)} ms`);
        console.log(`⚡ เวลาตอบสนองเร็วที่สุด: ${stats.minResponseTime.toFixed(2)} ms`);
        console.log(`🐌 เวลาตอบสนองช้าที่สุด: ${stats.maxResponseTime.toFixed(2)} ms`);
        console.log(`🚀 คำขอต่อวินาที: ${(stats.successfulRequests / (TEST_DURATION / 1000)).toFixed(2)} req/s`);
    }
    
    if (stats.errors.length > 0) {
        console.log('\n❌ ข้อผิดพลาด:');
        stats.errors.slice(0, 5).forEach((error, index) => {
            console.log(`${index + 1}. ${error.url} (${error.method}): ${error.error}`);
        });
        if (stats.errors.length > 5) {
            console.log(`... และอีก ${stats.errors.length - 5} ข้อผิดพลาด`);
        }
    }
}

// รีเซ็ตสถิติ
function resetStats() {
    stats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        errors: []
    };
}

// ฟังก์ชันหลักสำหรับรันการทดสอบประสิทธิภาพ
async function runPerformanceTests() {
    console.log('🚀 เริ่มต้นการทดสอบประสิทธิภาพ Central MCP Server\n');
    
    // รีเซ็ตสถิติ
    resetStats();
    
    try {
        // ทดสอบ Health Check
        await loadTestHealthCheck(5000);
        
        // ทดสอบการลงทะเบียน
        const registeredServers = await loadTestServerRegistration(20);
        
        // ทดสอบการดึงรายการ
        await loadTestGetServers(5000);
        
        // ทดสอบ Service Discovery
        await loadTestServiceDiscovery(5000);
        
        // ทำความสะอาด
        if (registeredServers.length > 0) {
            await cleanupServers(registeredServers);
        }
        
        // แสดงสถิติ
        displayStats();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error.message);
    }
    
    console.log('\n🎉 การทดสอบประสิทธิภาพเสร็จสิ้น!');
}

// รันการทดสอบถ้าไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
    runPerformanceTests().catch(console.error);
}

module.exports = {
    measureResponseTime,
    loadTestHealthCheck,
    loadTestServerRegistration,
    loadTestGetServers,
    loadTestServiceDiscovery,
    cleanupServers,
    displayStats,
    resetStats,
    runPerformanceTests
};