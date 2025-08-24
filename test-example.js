/**
 * ไฟล์ทดสอบตัวอย่างสำหรับ Central MCP Server
 * Example test file for Central MCP Server
 */

const axios = require('axios');

// กำหนดค่าเริ่มต้น
const BASE_URL = 'http://localhost:3000';
const TEST_SERVER = {
    name: 'test-mcp-server',
    url: 'http://localhost:8080',
    capabilities: ['chat', 'completion'],
    metadata: {
        version: '1.0.0',
        description: 'Test MCP Server'
    }
};

// ฟังก์ชันทดสอบการเชื่อมต่อ
async function testConnection() {
    try {
        console.log('🔍 ทดสอบการเชื่อมต่อ...');
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ การเชื่อมต่อสำเร็จ:', response.data);
        return true;
    } catch (error) {
        console.error('❌ การเชื่อมต่อล้มเหลว:', error.message);
        return false;
    }
}

// ฟังก์ชันทดสอบการลงทะเบียน MCP Server
async function testServerRegistration() {
    try {
        console.log('\n📝 ทดสอบการลงทะเบียน MCP Server...');
        const response = await axios.post(`${BASE_URL}/api/servers/register`, TEST_SERVER);
        console.log('✅ ลงทะเบียนสำเร็จ:', response.data);
        return response.data.id;
    } catch (error) {
        console.error('❌ การลงทะเบียนล้มเหลว:', error.response?.data || error.message);
        return null;
    }
}

// ฟังก์ชันทดสอบการดึงรายการ MCP Servers
async function testGetServers() {
    try {
        console.log('\n📋 ทดสอบการดึงรายการ MCP Servers...');
        const response = await axios.get(`${BASE_URL}/api/servers`);
        console.log('✅ ดึงรายการสำเร็จ:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ การดึงรายการล้มเหลว:', error.response?.data || error.message);
        return null;
    }
}

// ฟังก์ชันทดสอบ Service Discovery
async function testServiceDiscovery() {
    try {
        console.log('\n🔍 ทดสอบ Service Discovery...');
        const response = await axios.get(`${BASE_URL}/api/discovery/capabilities/chat`);
        console.log('✅ Service Discovery สำเร็จ:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Service Discovery ล้มเหลว:', error.response?.data || error.message);
        return null;
    }
}

// ฟังก์ชันทดสอบ Load Balancer
async function testLoadBalancer() {
    try {
        console.log('\n⚖️ ทดสอบ Load Balancer...');
        const response = await axios.get(`${BASE_URL}/api/load-balancer/stats`);
        console.log('✅ Load Balancer สำเร็จ:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Load Balancer ล้มเหลว:', error.response?.data || error.message);
        return null;
    }
}

// ฟังก์ชันทดสอบ Monitoring
async function testMonitoring() {
    try {
        console.log('\n📊 ทดสอบ Monitoring...');
        const response = await axios.get(`${BASE_URL}/api/monitoring/stats`);
        console.log('✅ Monitoring สำเร็จ:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Monitoring ล้มเหลว:', error.response?.data || error.message);
        return null;
    }
}

// ฟังก์ชันทดสอบการยกเลิกการลงทะเบียน
async function testServerUnregistration(serverId) {
    try {
        console.log('\n🗑️ ทดสอบการยกเลิกการลงทะเบียน...');
        const response = await axios.delete(`${BASE_URL}/api/servers/${serverId}`);
        console.log('✅ ยกเลิกการลงทะเบียนสำเร็จ:', response.data);
        return true;
    } catch (error) {
        console.error('❌ การยกเลิกการลงทะเบียนล้มเหลว:', error.response?.data || error.message);
        return false;
    }
}

// ฟังก์ชันหลักสำหรับรันการทดสอบทั้งหมด
async function runAllTests() {
    console.log('🚀 เริ่มต้นการทดสอบ Central MCP Server\n');
    
    // ทดสอบการเชื่อมต่อ
    const connected = await testConnection();
    if (!connected) {
        console.log('\n❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่');
        return;
    }
    
    // ทดสอบการลงทะเบียน
    const serverId = await testServerRegistration();
    
    // ทดสอบการดึงรายการ
    await testGetServers();
    
    // ทดสอบ Service Discovery
    await testServiceDiscovery();
    
    // ทดสอบ Load Balancer
    await testLoadBalancer();
    
    // ทดสอบ Monitoring
    await testMonitoring();
    
    // ทดสอบการยกเลิกการลงทะเบียน (ถ้ามี serverId)
    if (serverId) {
        await testServerUnregistration(serverId);
    }
    
    console.log('\n🎉 การทดสอบเสร็จสิ้น!');
}

// รันการทดสอบถ้าไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testConnection,
    testServerRegistration,
    testGetServers,
    testServiceDiscovery,
    testLoadBalancer,
    testMonitoring,
    testServerUnregistration,
    runAllTests
};