#!/bin/bash

echo "🚀 MCP Platform Installation Script"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing MCP Platform dependencies..."
npm install

# Build the project
echo "🔨 Building MCP Platform..."
npm run build

# Test MCP servers
echo "🧪 Testing MCP servers..."
npm run test:mcp

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 MCP Platform installation completed successfully!"
    echo ""
    echo "Quick start commands:"
    echo "  npm run dev:watch    - Start development server"
    echo "  npm run serve        - Start production server"
    echo "  npm run test:mcp     - Test MCP servers"
    echo ""
    echo "💡 The MCP Platform is now ready to use!"
else
    echo ""
    echo "⚠️  Installation completed but tests failed."
    echo "Please check the errors above and fix them before running."
fi
