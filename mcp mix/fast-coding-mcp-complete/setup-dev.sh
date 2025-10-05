#!/bin/bash

echo "🚀 Ultimate MCP Platform - Fast Development Setup"
echo "=================================================="

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
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOL
NODE_ENV=development
PORT=3000
DEBUG=true
LOG_LEVEL=info
EOL
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Run type check
echo "🔍 Running type check..."
npm run type-check

if [ $? -eq 0 ]; then
    echo "✅ Type check passed"
else
    echo "⚠️  Type check failed, but continuing setup..."
fi

# Format code
echo "🎨 Formatting code..."
npm run format

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Quick start commands:"
echo "  npm run dev          - Start development server with watch mode"
echo "  npm run dev:watch    - Start development server (fastest)"
echo "  npm run build        - Build for production"
echo "  npm run serve        - Serve production build"
echo "  npm run lint         - Check code quality"
echo "  npm run format       - Format code"
echo ""
echo "💡 Tips:"
echo "  - Use 'npm run dev:watch' for fastest development"
echo "  - Code will be auto-formatted on save"
echo "  - ESLint will catch issues automatically"
echo "  - All imports will be organized automatically"
