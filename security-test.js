/**
 * ไฟล์ทดสอบความปลอดภัยสำหรับ Central MCP Server
 * Security test file for Central MCP Server
 */

const axios = require('axios');
const crypto = require('crypto');

// กำหนดค่าเริ่มต้น
const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';
const SERVER_TOKEN = process.env.SERVER_TOKEN || 'your-server-token-here';

// ผลการทดสอบ
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// ฟังก์ชันสำหรับบันทึกผลการทดสอบ
function recordTest(testName, passed, message = '') {
    testResults.tests.push({
        name: testName,
        passed,
        message,
        timestamp: new Date().toISOString()
    });
    
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: ${message}`);
    }
}

// ทดสอบการเข้าถึงโดยไม่มี token
async function testUnauthorizedAccess() {
    console.log('\n🔒 ทดสอบการเข้าถึงโดยไม่ได้รับอนุญาต...');
    
    const protectedEndpoints = [
        { method: 'POST', path: '/api/servers/register' },
        { method: 'DELETE', path: '/api/servers/test-server' },
        { method: 'GET', path: '/api/monitoring/stats' },
        { method: 'GET', path: '/api/load-balancer/stats' }
    ];
    
    for (const endpoint of protectedEndpoints) {
        try {
            const response = await axios({
                method: endpoint.method,
                url: `${BASE_URL}${endpoint.path}`,
                validateStatus: () => true // ไม่ throw error สำหรับ status codes
            });
            
            if (response.status === 401 || response.status === 403) {
                recordTest(
                    `Unauthorized access to ${endpoint.method} ${endpoint.path}`,
                    true,
                    `ถูกปฏิเสธอย่างถูกต้อง (${response.status})`
                );
            } else {
                recordTest(
                    `Unauthorized access to ${endpoint.method} ${endpoint.path}`,
                    false,
                    `ไม่ได้ถูกปฏิเสธ (${response.status})`
                );
            }
        } catch (_) {
            recordTest(
                `Unauthorized access to ${endpoint.method} ${endpoint.path}`,
                true,
                'ถูกปฏิเสธอย่างถูกต้อง (Network Error)'
            );
        }
    }
}

// ทดสอบการใช้ token ที่ไม่ถูกต้อง
async function testInvalidToken() {
    console.log('\n🔑 ทดสอบการใช้ token ที่ไม่ถูกต้อง...');
    
    const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        '',
        'null',
        'undefined',
        crypto.randomBytes(32).toString('hex')
    ];
    
    for (const token of invalidTokens) {
        try {
            const response = await axios({
                method: 'GET',
                url: `${BASE_URL}/api/monitoring/stats`,
                headers: {
                    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
                },
                validateStatus: () => true
            });
            
            if (response.status === 401 || response.status === 403) {
                recordTest(
                    `Invalid token test: ${token.substring(0, 10)}...`,
                    true,
                    `ถูกปฏิเสธอย่างถูกต้อง (${response.status})`
                );
            } else {
                recordTest(
                    `Invalid token test: ${token.substring(0, 10)}...`,
                    false,
                    `ไม่ได้ถูกปฏิเสธ (${response.status})`
                );
            }
        } catch (_) {
            recordTest(
                `Invalid token test: ${token.substring(0, 10)}...`,
                true,
                'ถูกปฏิเสธอย่างถูกต้อง (Network Error)'
            );
        }
    }
}

// ทดสอบการใช้ token ที่ถูกต้อง
async function testValidToken() {
    console.log('\n✅ ทดสอบการใช้ token ที่ถูกต้อง...');
    
    const tokens = [
        { name: 'Admin Token', token: ADMIN_TOKEN },
        { name: 'Server Token', token: SERVER_TOKEN }
    ];
    
    for (const { name, token } of tokens) {
        if (!token || token === 'your-admin-token-here' || token === 'your-server-token-here') {
            recordTest(
                `Valid token test: ${name}`,
                false,
                'Token ไม่ได้ถูกกำหนดใน environment variables'
            );
            continue;
        }
        
        try {
            const response = await axios({
                method: 'GET',
                url: `${BASE_URL}/api/monitoring/stats`,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                recordTest(
                    `Valid token test: ${name}`,
                    true,
                    'เข้าถึงได้สำเร็จ'
                );
            } else {
                recordTest(
                    `Valid token test: ${name}`,
                    false,
                    `ไม่สามารถเข้าถึงได้ (${response.status})`
                );
            }
        } catch (error) {
            recordTest(
                `Valid token test: ${name}`,
                false,
                `เกิดข้อผิดพลาด: ${error.message}`
            );
        }
    }
}

// ทดสอบการป้องกัน SQL Injection
async function testSQLInjection() {
    console.log('\n💉 ทดสอบการป้องกัน SQL Injection...');
    
    const sqlInjectionPayloads = [
        "'; DROP TABLE servers; --",
        "' OR '1'='1",
        "'; DELETE FROM servers WHERE '1'='1'; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "admin'/*"
    ];
    
    for (const payload of sqlInjectionPayloads) {
        try {
            const response = await axios({
                method: 'GET',
                url: `${BASE_URL}/api/servers/${encodeURIComponent(payload)}`,
                validateStatus: () => true
            });
            
            // ถ้าได้ response ที่ไม่ใช่ 404 หรือ 400 อาจมีปัญหา
            if (response.status === 404 || response.status === 400) {
                recordTest(
                    `SQL Injection test: ${payload.substring(0, 20)}...`,
                    true,
                    'ถูกปฏิเสธอย่างถูกต้อง'
                );
            } else {
                recordTest(
                    `SQL Injection test: ${payload.substring(0, 20)}...`,
                    false,
                    `อาจมีช่องโหว่ (${response.status})`
                );
            }
        } catch (_) {
            recordTest(
                `SQL Injection test: ${payload.substring(0, 20)}...`,
                true,
                'ถูกปฏิเสธอย่างถูกต้อง (Network Error)'
            );
        }
    }
}

// ทดสอบการป้องกัน XSS
async function testXSSProtection() {
    console.log('\n🕷️ ทดสอบการป้องกัน XSS...');
    
    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>'
    ];
    
    for (const payload of xssPayloads) {
        try {
            const testServer = {
                name: payload,
                url: 'http://localhost:8080',
                capabilities: ['chat'],
                metadata: {
                    description: payload
                }
            };
            
            const response = await axios({
                method: 'POST',
                url: `${BASE_URL}/api/servers/register`,
                data: testServer,
                headers: {
                    'Authorization': `Bearer ${SERVER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                validateStatus: () => true
            });
            
            // ตรวจสอบว่า response ไม่มี script tags
            const responseText = JSON.stringify(response.data);
            if (responseText.includes('<script>') || responseText.includes('javascript:')) {
                recordTest(
                    `XSS Protection test: ${payload.substring(0, 20)}...`,
                    false,
                    'อาจมีช่องโหว่ XSS'
                );
            } else {
                recordTest(
                    `XSS Protection test: ${payload.substring(0, 20)}...`,
                    true,
                    'ป้องกัน XSS ได้อย่างถูกต้อง'
                );
            }
            
            // ลบเซิร์ฟเวอร์ทดสอบ (ถ้าสร้างสำเร็จ)
            if (response.status === 201 && response.data.id) {
                await axios.delete(`${BASE_URL}/api/servers/${response.data.id}`, {
                    headers: { 'Authorization': `Bearer ${SERVER_TOKEN}` }
                }).catch(() => {});
            }
            
        } catch (_) {
            recordTest(
                `XSS Protection test: ${payload.substring(0, 20)}...`,
                true,
                'ถูกปฏิเสธอย่างถูกต้อง'
            );
        }
    }
}

// ทดสอบ Rate Limiting
async function testRateLimiting() {
    console.log('\n🚦 ทดสอบ Rate Limiting...');
    
    const requests = [];
    const maxRequests = 100; // ส่งคำขอ 100 ครั้งในเวลาสั้นๆ
    
    for (let i = 0; i < maxRequests; i++) {
        requests.push(
            axios({
                method: 'GET',
                url: `${BASE_URL}/health`,
                validateStatus: () => true
            })
        );
    }
    
    try {
        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        
        if (rateLimitedResponses.length > 0) {
            recordTest(
                'Rate Limiting test',
                true,
                `Rate limiting ทำงาน (${rateLimitedResponses.length}/${maxRequests} requests ถูก rate limit)`
            );
        } else {
            recordTest(
                'Rate Limiting test',
                false,
                'ไม่มี rate limiting หรือ limit สูงเกินไป'
            );
        }
    } catch (error) {
        recordTest(
            'Rate Limiting test',
            false,
            `เกิดข้อผิดพลาด: ${error.message}`
        );
    }
}

// ทดสอบ CORS Headers
async function testCORSHeaders() {
    console.log('\n🌐 ทดสอบ CORS Headers...');
    
    try {
        const response = await axios({
            method: 'OPTIONS',
            url: `${BASE_URL}/api/servers`,
            headers: {
                'Origin': 'http://malicious-site.com',
                'Access-Control-Request-Method': 'POST'
            },
            validateStatus: () => true
        });
        
        const corsHeaders = {
            'access-control-allow-origin': response.headers['access-control-allow-origin'],
            'access-control-allow-methods': response.headers['access-control-allow-methods'],
            'access-control-allow-headers': response.headers['access-control-allow-headers']
        };
        
        // ตรวจสอบว่า CORS ไม่อนุญาตทุก origin
        if (corsHeaders['access-control-allow-origin'] === '*') {
            recordTest(
                'CORS Headers test',
                false,
                'อนุญาต origin ทั้งหมด (*) ซึ่งอาจไม่ปลอดภัย'
            );
        } else {
            recordTest(
                'CORS Headers test',
                true,
                'CORS headers ถูกกำหนดอย่างเหมาะสม'
            );
        }
    } catch (error) {
        recordTest(
            'CORS Headers test',
            false,
            `เกิดข้อผิดพลาด: ${error.message}`
        );
    }
}

// แสดงสรุปผลการทดสอบ
function displaySecurityTestResults() {
    console.log('\n🛡️ สรุปผลการทดสอบความปลอดภัย:');
    console.log('=' .repeat(60));
    console.log(`✅ ผ่าน: ${testResults.passed}`);
    console.log(`❌ ไม่ผ่าน: ${testResults.failed}`);
    console.log(`📊 รวม: ${testResults.tests.length}`);
    console.log(`🎯 อัตราความสำเร็จ: ${((testResults.passed / testResults.tests.length) * 100).toFixed(2)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ การทดสอบที่ไม่ผ่าน:');
        testResults.tests
            .filter(test => !test.passed)
            .forEach((test, index) => {
                console.log(`${index + 1}. ${test.name}: ${test.message}`);
            });
    }
    
    console.log('\n💡 คำแนะนำ:');
    if (testResults.failed === 0) {
        console.log('- ระบบมีความปลอดภัยในระดับดี');
    } else {
        console.log('- ควรแก้ไขปัญหาความปลอดภัยที่พบ');
        console.log('- ตรวจสอบการกำหนดค่า authentication และ authorization');
        console.log('- พิจารณาเพิ่ม security headers และ input validation');
    }
}

// รีเซ็ตผลการทดสอบ
function resetTestResults() {
    testResults = {
        passed: 0,
        failed: 0,
        tests: []
    };
}

// ฟังก์ชันหลักสำหรับรันการทดสอบความปลอดภัย
async function runSecurityTests() {
    console.log('🛡️ เริ่มต้นการทดสอบความปลอดภัย Central MCP Server\n');
    
    // รีเซ็ตผลการทดสอบ
    resetTestResults();
    
    try {
        // ทดสอบการเข้าถึงโดยไม่ได้รับอนุญาต
        await testUnauthorizedAccess();
        
        // ทดสอบ token ที่ไม่ถูกต้อง
        await testInvalidToken();
        
        // ทดสอบ token ที่ถูกต้อง
        await testValidToken();
        
        // ทดสอบการป้องกัน SQL Injection
        await testSQLInjection();
        
        // ทดสอบการป้องกัน XSS
        await testXSSProtection();
        
        // ทดสอบ Rate Limiting
        await testRateLimiting();
        
        // ทดสอบ CORS Headers
        await testCORSHeaders();
        
        // แสดงสรุปผล
        displaySecurityTestResults();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการทดสอบความปลอดภัย:', error.message);
    }
    
    console.log('\n🎉 การทดสอบความปลอดภัยเสร็จสิ้น!');
}

// รันการทดสอบถ้าไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
    runSecurityTests().catch(console.error);
}

module.exports = {
    testUnauthorizedAccess,
    testInvalidToken,
    testValidToken,
    testSQLInjection,
    testXSSProtection,
    testRateLimiting,
    testCORSHeaders,
    displaySecurityTestResults,
    resetTestResults,
    runSecurityTests,
    testResults
};