@echo off
echo 🚀 MCP Platform Installation Script
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed
echo.

REM Install dependencies
echo 📦 Installing MCP Platform dependencies...
call npm install

REM Build the project
echo 🔨 Building MCP Platform...
call npm run build

REM Test MCP servers
echo 🧪 Testing MCP servers...
call npm run test:mcp

if %errorlevel% equ 0 (
    echo.
    echo 🎉 MCP Platform installation completed successfully!
    echo.
    echo Quick start commands:
    echo   npm run dev:watch    - Start development server
    echo   npm run serve        - Start production server
    echo   npm run test:mcp     - Test MCP servers
    echo.
    echo 💡 The MCP Platform is now ready to use!
) else (
    echo.
    echo ⚠️  Installation completed but tests failed.
    echo Please check the errors above and fix them before running.
)

pause
