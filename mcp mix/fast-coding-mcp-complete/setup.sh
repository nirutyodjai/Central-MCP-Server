#!/bin/bash

# Fast Coding MCP Server Setup Script

echo "🚀 Setting up Fast Coding MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20.x+"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please use Node.js 20.x+"
    exit 1
fi

echo "✅ Node.js version $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "📦 Installing dependencies..."

# Install dependencies
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Project built successfully"

# Run tests
echo "🧪 Running tests..."
npm run test

if [ $? -ne 0 ]; then
    echo "⚠️  Tests failed, but server may still work"
    echo "   You can run tests manually with: npm test"
else
    echo "✅ All tests passed"
fi

echo ""
echo "🎉 Fast Coding MCP Server setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the server: npm start"
echo "   2. Or run in development mode: npm run dev"
echo "   3. The server will be available at: http://localhost:5200"
echo ""
echo "🔧 Configuration:"
echo "   - Edit package.json for dependencies"
echo "   - Modify src/config.ts for server settings"
echo "   - Check central-mcp-config.json for integration settings"
echo ""
echo "📚 For more information, see: README.md"
