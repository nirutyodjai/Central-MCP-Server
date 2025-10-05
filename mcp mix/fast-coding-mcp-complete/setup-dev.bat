@echo off
echo 🚀 Ultimate MCP Platform - Fast Development Setup
echo ==================================================
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
echo 📦 Installing dependencies...
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo 🔧 Creating .env file...
    echo NODE_ENV=development>.env
    echo PORT=3000>>.env
    echo DEBUG=true>>.env
    echo LOG_LEVEL=info>>.env
    echo ✅ Created .env file
) else (
    echo ✅ .env file already exists
)
echo.

REM Run type check
echo 🔍 Running type check...
call npm run type-check

if %errorlevel% equ 0 (
    echo ✅ Type check passed
) else (
    echo ⚠️  Type check failed, but continuing setup...
)
echo.

REM Format code
echo 🎨 Formatting code...
call npm run format

echo.
echo 🎉 Setup completed successfully!
echo.
echo Quick start commands:
echo   npm run dev          - Start development server with watch mode
echo   npm run dev:watch    - Start development server (fastest)
echo   npm run build        - Build for production
echo   npm run serve        - Serve production build
echo   npm run lint         - Check code quality
echo   npm run format       - Format code
echo.
echo 💡 Tips:
echo   - Use 'npm run dev:watch' for fastest development
echo   - Code will be auto-formatted on save
echo   - ESLint will catch issues automatically
echo   - All imports will be organized automatically
echo.
pause
