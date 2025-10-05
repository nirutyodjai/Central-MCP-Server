# 🚀 Fast Development Guide

## Quick Start

### Windows

```bash
# Run the setup script
.\setup-dev.bat
```

### Linux/macOS

```bash
# Make script executable and run
chmod +x setup-dev.sh
./setup-dev.sh
```

## Development Commands

| Command             | Description                             | Speed  |
| ------------------- | --------------------------------------- | ------ |
| `npm run dev:watch` | **Fastest** development with hot reload | ⚡⚡⚡ |
| `npm run dev`       | Development with watch mode             | ⚡⚡   |
| `npm run start`     | Single run (no watch)                   | ⚡     |

## Code Quality

```bash
# Format code automatically
npm run format

# Check code quality
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## VS Code Setup

1. **Recommended Extensions** are listed in `.vscode/extensions.json`
2. **Auto-formatting** is enabled on save
3. **ESLint** runs automatically
4. **Import organization** happens on save

## File Structure

```
src/
├── core/           # Core MCP functionality
├── integrations/   # External integrations
├── services/       # Business logic services
├── utils/          # Utility functions
├── tools/          # Development tools
└── cache/          # Caching mechanisms
```

## Tips for Fast Development

1. **Use `npm run dev:watch`** for fastest iteration
2. **Enable auto-save** in VS Code (Settings > Auto Save)
3. **Use relative imports** for better IntelliSense
4. **Leverage TypeScript** for better DX
5. **Use the setup scripts** for consistent environment

## Shortcuts

- `Ctrl+Shift+P` → "Format Document" - Format current file
- `Ctrl+Shift+I` → Format selection
- `F5` → Start debugging (if configured)
- `Ctrl+Space` → Trigger suggestions

## Troubleshooting

### If you encounter issues:

1. **Clean install**: `npm run fresh-install`
2. **Clear cache**: `npm run clean`
3. **Check types**: `npm run type-check`
4. **Format everything**: `npm run format`

---

⚡ **Pro Tip**: The setup scripts configure everything for optimal development speed with AI assistance!
