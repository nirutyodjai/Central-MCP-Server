/**
 * ไฟล์ทดสอบ UI และ Dashboard สำหรับ Central MCP Server
 * UI and Dashboard test file for Central MCP Server
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

// กำหนดค่าเริ่มต้น
const BASE_URL = 'http://localhost:3000';
const DASHBOARD_URL = `${BASE_URL}/`;

// ผลการทดสอบ UI
let uiTestResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// ฟังก์ชันสำหรับบันทึกผลการทดสอบ UI
function recordUITest(testName, passed, message = '') {
    uiTestResults.tests.push({
        name: testName,
        passed,
        message,
        timestamp: new Date().toISOString()
    });
    
    if (passed) {
        uiTestResults.passed++;
        console.log(`✅ ${testName}: ${message}`);
    } else {
        uiTestResults.failed++;
        console.log(`❌ ${testName}: ${message}`);
    }
}

// ทดสอบการโหลดหน้า Dashboard
async function testDashboardLoad() {
    console.log('\n🖥️ ทดสอบการโหลดหน้า Dashboard...');
    
    try {
        const response = await axios.get(DASHBOARD_URL, {
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            recordUITest(
                'Dashboard Load',
                true,
                'หน้า Dashboard โหลดสำเร็จ'
            );
            return response.data;
        } else {
            recordUITest(
                'Dashboard Load',
                false,
                `ไม่สามารถโหลดหน้า Dashboard ได้ (${response.status})`
            );
            return null;
        }
    } catch (error) {
        recordUITest(
            'Dashboard Load',
            false,
            `เกิดข้อผิดพลาด: ${error.message}`
        );
        return null;
    }
}

// ทดสอบ HTML Structure
function testHTMLStructure(html) {
    console.log('\n📋 ทดสอบโครงสร้าง HTML...');
    
    if (!html) {
        recordUITest('HTML Structure', false, 'ไม่มี HTML content');
        return;
    }
    
    try {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // ทดสอบ DOCTYPE
        const doctype = dom.window.document.doctype;
        if (doctype && doctype.name === 'html') {
            recordUITest('HTML DOCTYPE', true, 'มี DOCTYPE ที่ถูกต้อง');
        } else {
            recordUITest('HTML DOCTYPE', false, 'ไม่มี DOCTYPE หรือไม่ถูกต้อง');
        }
        
        // ทดสอบ Title
        const title = document.querySelector('title');
        if (title && title.textContent.trim()) {
            recordUITest('HTML Title', true, `Title: ${title.textContent}`);
        } else {
            recordUITest('HTML Title', false, 'ไม่มี title หรือ title ว่าง');
        }
        
        // ทดสอบ Meta tags
        const charset = document.querySelector('meta[charset]');
        if (charset) {
            recordUITest('Meta Charset', true, `Charset: ${charset.getAttribute('charset')}`);
        } else {
            recordUITest('Meta Charset', false, 'ไม่มี meta charset');
        }
        
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            recordUITest('Meta Viewport', true, 'มี viewport meta tag');
        } else {
            recordUITest('Meta Viewport', false, 'ไม่มี viewport meta tag');
        }
        
        // ทดสอบ CSS
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
        if (stylesheets.length > 0) {
            recordUITest('CSS Stylesheets', true, `มี ${stylesheets.length} stylesheet(s)`);
        } else {
            recordUITest('CSS Stylesheets', false, 'ไม่มี CSS stylesheets');
        }
        
        // ทดสอบ JavaScript
        const scripts = document.querySelectorAll('script');
        if (scripts.length > 0) {
            recordUITest('JavaScript Files', true, `มี ${scripts.length} script(s)`);
        } else {
            recordUITest('JavaScript Files', false, 'ไม่มี JavaScript files');
        }
        
        return document;
        
    } catch (error) {
        recordUITest('HTML Structure', false, `เกิดข้อผิดพลาดในการ parse HTML: ${error.message}`);
        return null;
    }
}

// ทดสอบ Dashboard Components
function testDashboardComponents(document) {
    console.log('\n🧩 ทดสอบ Dashboard Components...');
    
    if (!document) {
        recordUITest('Dashboard Components', false, 'ไม่มี document');
        return;
    }
    
    // ทดสอบ Navigation
    const nav = document.querySelector('nav, .navbar, .navigation');
    if (nav) {
        recordUITest('Navigation Component', true, 'มี navigation component');
    } else {
        recordUITest('Navigation Component', false, 'ไม่มี navigation component');
    }
    
    // ทดสอบ Main Content Area
    const main = document.querySelector('main, .main-content, .dashboard');
    if (main) {
        recordUITest('Main Content Area', true, 'มี main content area');
    } else {
        recordUITest('Main Content Area', false, 'ไม่มี main content area');
    }
    
    // ทดสอบ Server List/Table
    const serverList = document.querySelector('.server-list, .servers-table, table');
    if (serverList) {
        recordUITest('Server List Component', true, 'มี server list component');
    } else {
        recordUITest('Server List Component', false, 'ไม่มี server list component');
    }
    
    // ทดสอบ Statistics/Metrics
    const stats = document.querySelector('.stats, .metrics, .statistics');
    if (stats) {
        recordUITest('Statistics Component', true, 'มี statistics component');
    } else {
        recordUITest('Statistics Component', false, 'ไม่มี statistics component');
    }
    
    // ทดสอบ Forms
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
        recordUITest('Form Components', true, `มี ${forms.length} form(s)`);
    } else {
        recordUITest('Form Components', false, 'ไม่มี form components');
    }
    
    // ทดสอบ Buttons
    const buttons = document.querySelectorAll('button, .btn, input[type="button"], input[type="submit"]');
    if (buttons.length > 0) {
        recordUITest('Button Components', true, `มี ${buttons.length} button(s)`);
    } else {
        recordUITest('Button Components', false, 'ไม่มี button components');
    }
}

// ทดสอบ API Endpoints สำหรับ Dashboard
async function testDashboardAPIs() {
    console.log('\n🔌 ทดสอบ API Endpoints สำหรับ Dashboard...');
    
    const apiEndpoints = [
        { name: 'Health Check', url: '/health', method: 'GET' },
        { name: 'Server List', url: '/api/servers', method: 'GET' },
        { name: 'Load Balancer Stats', url: '/api/load-balancer/stats', method: 'GET' },
        { name: 'Monitoring Stats', url: '/api/monitoring/stats', method: 'GET' },
        { name: 'Service Discovery', url: '/api/discovery/capabilities', method: 'GET' }
    ];
    
    for (const endpoint of apiEndpoints) {
        try {
            const response = await axios({
                method: endpoint.method,
                url: `${BASE_URL}${endpoint.url}`,
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                recordUITest(
                    `API: ${endpoint.name}`,
                    true,
                    'API ทำงานปกติ'
                );
            } else if (response.status === 401 || response.status === 403) {
                recordUITest(
                    `API: ${endpoint.name}`,
                    true,
                    'API ต้องการ authentication (ปกติ)'
                );
            } else {
                recordUITest(
                    `API: ${endpoint.name}`,
                    false,
                    `API ส่งคืน status ${response.status}`
                );
            }
        } catch (error) {
            recordUITest(
                `API: ${endpoint.name}`,
                false,
                `เกิดข้อผิดพลาด: ${error.message}`
            );
        }
    }
}

// ทดสอบ Static Files
async function testStaticFiles() {
    console.log('\n📁 ทดสอบ Static Files...');
    
    const staticFiles = [
        { name: 'Dashboard CSS', url: '/dashboard.css' },
        { name: 'Dashboard JS', url: '/dashboard.js' },
        { name: 'Favicon', url: '/favicon.ico' }
    ];
    
    for (const file of staticFiles) {
        try {
            const response = await axios({
                method: 'GET',
                url: `${BASE_URL}${file.url}`,
                timeout: 5000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                recordUITest(
                    `Static File: ${file.name}`,
                    true,
                    'ไฟล์โหลดสำเร็จ'
                );
            } else if (response.status === 404) {
                recordUITest(
                    `Static File: ${file.name}`,
                    false,
                    'ไฟล์ไม่พบ (404)'
                );
            } else {
                recordUITest(
                    `Static File: ${file.name}`,
                    false,
                    `ไฟล์ส่งคืน status ${response.status}`
                );
            }
        } catch (error) {
            recordUITest(
                `Static File: ${file.name}`,
                false,
                `เกิดข้อผิดพลาด: ${error.message}`
            );
        }
    }
}

// ทดสอบ Responsive Design
function testResponsiveDesign(html) {
    console.log('\n📱 ทดสอบ Responsive Design...');
    
    if (!html) {
        recordUITest('Responsive Design', false, 'ไม่มี HTML content');
        return;
    }
    
    try {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // ตรวจสอบ viewport meta tag
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            const content = viewport.getAttribute('content');
            if (content && content.includes('width=device-width')) {
                recordUITest(
                    'Viewport Meta Tag',
                    true,
                    'มี viewport meta tag ที่เหมาะสม'
                );
            } else {
                recordUITest(
                    'Viewport Meta Tag',
                    false,
                    'viewport meta tag ไม่เหมาะสมสำหรับ responsive'
                );
            }
        } else {
            recordUITest(
                'Viewport Meta Tag',
                false,
                'ไม่มี viewport meta tag'
            );
        }
        
        // ตรวจสอบ CSS Media Queries (ในไฟล์ inline)
        const styles = document.querySelectorAll('style');
        let hasMediaQueries = false;
        
        styles.forEach(style => {
            if (style.textContent && style.textContent.includes('@media')) {
                hasMediaQueries = true;
            }
        });
        
        if (hasMediaQueries) {
            recordUITest(
                'CSS Media Queries',
                true,
                'พบ media queries ใน inline CSS'
            );
        } else {
            recordUITest(
                'CSS Media Queries',
                false,
                'ไม่พบ media queries ใน inline CSS (อาจอยู่ในไฟล์ external)'
            );
        }
        
    } catch (error) {
        recordUITest(
            'Responsive Design',
            false,
            `เกิดข้อผิดพลาด: ${error.message}`
        );
    }
}

// ทดสอบ Accessibility
function testAccessibility(html) {
    console.log('\n♿ ทดสอบ Accessibility...');
    
    if (!html) {
        recordUITest('Accessibility', false, 'ไม่มี HTML content');
        return;
    }
    
    try {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // ตรวจสอบ lang attribute
        const html_element = document.querySelector('html');
        if (html_element && html_element.getAttribute('lang')) {
            recordUITest(
                'HTML Lang Attribute',
                true,
                `Lang: ${html_element.getAttribute('lang')}`
            );
        } else {
            recordUITest(
                'HTML Lang Attribute',
                false,
                'ไม่มี lang attribute ใน html element'
            );
        }
        
        // ตรวจสอบ alt attributes ในรูปภาพ
        const images = document.querySelectorAll('img');
        let imagesWithAlt = 0;
        images.forEach(img => {
            if (img.getAttribute('alt') !== null) {
                imagesWithAlt++;
            }
        });
        
        if (images.length === 0) {
            recordUITest(
                'Image Alt Attributes',
                true,
                'ไม่มีรูปภาพ'
            );
        } else if (imagesWithAlt === images.length) {
            recordUITest(
                'Image Alt Attributes',
                true,
                `รูปภาพทั้งหมด (${images.length}) มี alt attribute`
            );
        } else {
            recordUITest(
                'Image Alt Attributes',
                false,
                `รูปภาพ ${imagesWithAlt}/${images.length} มี alt attribute`
            );
        }
        
        // ตรวจสอบ form labels
        const inputs = document.querySelectorAll('input, select, textarea');
        let inputsWithLabels = 0;
        inputs.forEach(input => {
            const id = input.getAttribute('id');
            const label = document.querySelector(`label[for="${id}"]`);
            if (label || input.getAttribute('aria-label') || input.getAttribute('placeholder')) {
                inputsWithLabels++;
            }
        });
        
        if (inputs.length === 0) {
            recordUITest(
                'Form Input Labels',
                true,
                'ไม่มี form inputs'
            );
        } else if (inputsWithLabels === inputs.length) {
            recordUITest(
                'Form Input Labels',
                true,
                `form inputs ทั้งหมด (${inputs.length}) มี labels`
            );
        } else {
            recordUITest(
                'Form Input Labels',
                false,
                `form inputs ${inputsWithLabels}/${inputs.length} มี labels`
            );
        }
        
    } catch (error) {
        recordUITest(
            'Accessibility',
            false,
            `เกิดข้อผิดพลาด: ${error.message}`
        );
    }
}

// แสดงสรุปผลการทดสอบ UI
function displayUITestResults() {
    console.log('\n🖥️ สรุปผลการทดสอบ UI และ Dashboard:');
    console.log('=' .repeat(60));
    console.log(`✅ ผ่าน: ${uiTestResults.passed}`);
    console.log(`❌ ไม่ผ่าน: ${uiTestResults.failed}`);
    console.log(`📊 รวม: ${uiTestResults.tests.length}`);
    console.log(`🎯 อัตราความสำเร็จ: ${((uiTestResults.passed / uiTestResults.tests.length) * 100).toFixed(2)}%`);
    
    if (uiTestResults.failed > 0) {
        console.log('\n❌ การทดสอบที่ไม่ผ่าน:');
        uiTestResults.tests
            .filter(test => !test.passed)
            .forEach((test, index) => {
                console.log(`${index + 1}. ${test.name}: ${test.message}`);
            });
    }
    
    console.log('\n💡 คำแนะนำ:');
    if (uiTestResults.failed === 0) {
        console.log('- Dashboard และ UI ทำงานได้ดี');
    } else {
        console.log('- ควรแก้ไขปัญหา UI ที่พบ');
        console.log('- ตรวจสอบ static files และ API endpoints');
        console.log('- พิจารณาปรับปรุง accessibility และ responsive design');
    }
}

// รีเซ็ตผลการทดสอบ UI
function resetUITestResults() {
    uiTestResults = {
        passed: 0,
        failed: 0,
        tests: []
    };
}

// ฟังก์ชันหลักสำหรับรันการทดสอบ UI
async function runUITests() {
    console.log('🖥️ เริ่มต้นการทดสอบ UI และ Dashboard\n');
    
    // รีเซ็ตผลการทดสอบ
    resetUITestResults();
    
    try {
        // ทดสอบการโหลดหน้า Dashboard
        const html = await testDashboardLoad();
        
        if (html) {
            // ทดสอบโครงสร้าง HTML
            const document = testHTMLStructure(html);
            
            // ทดสอบ Dashboard Components
            testDashboardComponents(document);
            
            // ทดสอบ Responsive Design
            testResponsiveDesign(html);
            
            // ทดสอบ Accessibility
            testAccessibility(html);
        }
        
        // ทดสอบ API Endpoints
        await testDashboardAPIs();
        
        // ทดสอบ Static Files
        await testStaticFiles();
        
        // แสดงสรุปผล
        displayUITestResults();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการทดสอบ UI:', error.message);
    }
    
    console.log('\n🎉 การทดสอบ UI เสร็จสิ้น!');
}

// รันการทดสอบถ้าไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
    runUITests().catch(console.error);
}

module.exports = {
    testDashboardLoad,
    testHTMLStructure,
    testDashboardComponents,
    testDashboardAPIs,
    testStaticFiles,
    testResponsiveDesign,
    testAccessibility,
    displayUITestResults,
    resetUITestResults,
    runUITests,
    uiTestResults
};