// Docker support and deployment configuration
export class DockerManager {
  constructor(projectRoot = '.') {
    this.projectRoot = projectRoot;
    this.composeFile = `${projectRoot}/docker-compose.yml`;
    this.dockerfile = `${projectRoot}/Dockerfile`;
  }
  // Generate Dockerfile for the MCP server
  generateDockerfile(options = {}) {
    const {
      nodeVersion = '20',
      port = 5200,
      managementPort = 5201,
      wsPort = 5202,
      baseImage = 'node:20-alpine',
    } = options;
    return `# Multi-stage build for optimal image size
FROM ${baseImage} AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM ${baseImage} AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy dependencies from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nextjs:nodejs . .

# Create data directory
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE ${port} ${managementPort} ${wsPort}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${managementPort}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=${port}
ENV MANAGEMENT_PORT=${managementPort}
ENV WS_PORT=${wsPort}

# Start the application
CMD ["node", "dist/launch-enhanced.js"]
`;
  }
  // Generate docker-compose.yml
  generateDockerCompose(options = {}) {
    const {
      mcpPort = 5200,
      managementPort = 5201,
      wsPort = 5202,
      databasePath = './data',
      restartPolicy = 'unless-stopped',
      networks = ['mcp-network'],
    } = options;
    return `version: '3.8'

services:
  fast-coding-mcp:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${mcpPort}:5200"
      - "${managementPort}:5201"
      - "${wsPort}:5202"
    volumes:
      - ${databasePath}:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=5200
      - MANAGEMENT_PORT=5201
      - WS_PORT=5202
    restart: ${restartPolicy}
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5201/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Redis for advanced caching
  # redis:
  #   image: redis:7-alpine
  #   ports:
  #     - "6379:6379"
  #   volumes:
  #     - redis-data:/data
  #   networks:
  #     - mcp-network
  #   restart: unless-stopped

  # Optional: PostgreSQL for analytics
  # postgres:
  #   image: postgres:15-alpine
  #   environment:
  #     POSTGRES_DB: fast_coding_mcp
  #     POSTGRES_USER: mcp_user
  #     POSTGRES_PASSWORD: mcp_password
  #   ports:
  #     - "5432:5432"
  #   volumes:
  #     - postgres-data:/var/lib/postgresql/data
  #   networks:
  #     - mcp-network
  #   restart: unless-stopped

networks:
  mcp-network:
    driver: bridge

# volumes:
#   redis-data:
#   postgres-data:
`;
  }
  // Generate .dockerignore file
  generateDockerIgnore() {
    return `node_modules
npm-debug.log
Dockerfile
.dockerignore
docker-compose.yml
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.vscode
.idea
*.log
dist
*.tgz
*.tar.gz
.DS_Store
Thumbs.db
`;
  }
  // Create deployment files
  async createDeploymentFiles(options = {}) {
    const fs = await import('fs/promises');
    try {
      // Create Dockerfile
      await fs.writeFile(this.dockerfile, this.generateDockerfile(options));
      // Create docker-compose.yml
      await fs.writeFile(this.composeFile, this.generateDockerCompose());
      // Create .dockerignore
      await fs.writeFile('.dockerignore', this.generateDockerIgnore());
      console.log('✅ Docker deployment files created');
      console.log(`   📄 ${this.dockerfile}`);
      console.log(`   📄 ${this.composeFile}`);
      console.log(`   📄 .dockerignore`);
    } catch (error) {
      console.error('❌ Failed to create Docker files:', error);
      throw error;
    }
  }
  // Build Docker image
  async buildImage(tag = 'fast-coding-mcp:latest') {
    const { exec } = await import('child_process');
    return new Promise((resolve, reject) => {
      exec(`docker build -t ${tag} .`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Docker build failed:', error);
          reject(error);
        } else {
          console.log('✅ Docker image built successfully');
          console.log(stdout);
          resolve();
        }
      });
    });
  }
  // Deploy with docker-compose
  async deploy() {
    const { exec } = await import('child_process');
    return new Promise((resolve, reject) => {
      exec('docker-compose up -d', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Docker deployment failed:', error);
          reject(error);
        } else {
          console.log('🚀 Docker deployment started successfully');
          console.log(stdout);
          resolve();
        }
      });
    });
  }
}
// Multi-language support system
export class MultiLanguageManager {
  constructor() {
    this.supportedLanguages = new Map();
    this.languageDetectors = [];
    this.initializeLanguageSupport();
  }
  // Initialize supported languages
  initializeLanguageSupport() {
    // JavaScript/TypeScript
    this.supportedLanguages.set('javascript', {
      name: 'JavaScript',
      extensions: ['.js', '.mjs'],
      features: [
        'syntax-highlighting',
        'linting',
        'formatting',
        'intellisense',
      ],
      tools: ['eslint', 'prettier', 'typescript'],
      aiModels: ['js-analysis', 'js-generation'],
    });
    this.supportedLanguages.set('typescript', {
      name: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      features: [
        'syntax-highlighting',
        'linting',
        'formatting',
        'intellisense',
        'type-checking',
      ],
      tools: ['eslint', 'prettier', 'typescript'],
      aiModels: ['ts-analysis', 'ts-generation'],
    });
    // Python
    this.supportedLanguages.set('python', {
      name: 'Python',
      extensions: ['.py', '.pyw'],
      features: [
        'syntax-highlighting',
        'linting',
        'formatting',
        'intellisense',
      ],
      tools: ['flake8', 'black', 'mypy', 'pylint'],
      aiModels: ['python-analysis', 'python-generation'],
    });
    // Java
    this.supportedLanguages.set('java', {
      name: 'Java',
      extensions: ['.java'],
      features: ['syntax-highlighting', 'linting', 'formatting'],
      tools: ['checkstyle', 'google-java-format'],
      aiModels: ['java-analysis', 'java-generation'],
    });
    // C++
    this.supportedLanguages.set('cpp', {
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.h'],
      features: ['syntax-highlighting', 'linting', 'formatting'],
      tools: ['clang-format', 'cppcheck'],
      aiModels: ['cpp-analysis'],
    });
    // Go
    this.supportedLanguages.set('go', {
      name: 'Go',
      extensions: ['.go'],
      features: ['syntax-highlighting', 'linting', 'formatting'],
      tools: ['gofmt', 'go vet', 'golint'],
      aiModels: ['go-analysis', 'go-generation'],
    });
    // Rust
    this.supportedLanguages.set('rust', {
      name: 'Rust',
      extensions: ['.rs'],
      features: ['syntax-highlighting', 'linting', 'formatting'],
      tools: ['rustfmt', 'clippy'],
      aiModels: ['rust-analysis'],
    });
    // Setup language detection patterns
    this.setupLanguageDetectors();
  }
  setupLanguageDetectors() {
    // File extension detector
    this.languageDetectors.push({
      name: 'extension',
      detect: async filePath => {
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        for (const [langId, support] of this.supportedLanguages) {
          if (support.extensions.includes(ext)) {
            return Promise.resolve(langId);
          }
        }
        return Promise.resolve(null);
      },
    });
    // Shebang detector
    this.languageDetectors.push({
      name: 'shebang',
      detect: async filePath => {
        try {
          const fs = await import('fs/promises');
          const content = await fs.readFile(filePath, 'utf-8');
          const firstLine = content.split('\n')[0];
          if (firstLine.startsWith('#!')) {
            if (firstLine.includes('python')) return 'python';
            if (firstLine.includes('node')) return 'javascript';
            if (firstLine.includes('bash') || firstLine.includes('sh'))
              return 'shell';
          }
          return null;
        } catch {
          return null;
        }
      },
    });
    // Content-based detector
    this.languageDetectors.push({
      name: 'content',
      detect: async filePath => {
        try {
          const fs = await import('fs/promises');
          const content = await fs.readFile(filePath, 'utf-8');
          // Simple pattern matching
          if (
            content.includes('import React') ||
            content.includes('from "react"')
          )
            return Promise.resolve('typescript');
          if (
            content.includes('def ') &&
            content.includes(':') &&
            !content.includes('self.')
          )
            return Promise.resolve('python');
          if (
            content.includes('public class') ||
            content.includes('import java.')
          )
            return Promise.resolve('java');
          if (content.includes('package main') && content.includes('func main'))
            return Promise.resolve('go');
          if (content.includes('fn main') || content.includes('println!'))
            return Promise.resolve('rust');
          if (content.includes('#include') && content.includes('int main'))
            return Promise.resolve('cpp');
          return Promise.resolve(null);
        } catch {
          return Promise.resolve(null);
        }
      },
    });
  }
  // Detect language of a file
  async detectLanguage(filePath) {
    for (const detector of this.languageDetectors) {
      try {
        const result = await detector.detect(filePath);
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn(`Language detector ${detector.name} failed:`, error);
      }
    }
    return null;
  }
  // Get language support information
  getLanguageSupport(languageId) {
    return this.supportedLanguages.get(languageId) || null;
  }
  // Get all supported languages
  getSupportedLanguages() {
    return Array.from(this.supportedLanguages.values());
  }
  // Check if language is supported
  isLanguageSupported(languageId) {
    return this.supportedLanguages.has(languageId);
  }
  // Get supported file extensions
  getSupportedExtensions() {
    const extensions = new Set();
    for (const support of this.supportedLanguages.values()) {
      support.extensions.forEach(ext => extensions.add(ext));
    }
    return Array.from(extensions);
  }
  // Format code for a specific language
  async formatCode(code, languageId) {
    const support = this.supportedLanguages.get(languageId);
    if (!support) {
      throw new Error(`Language ${languageId} not supported`);
    }
    // This would integrate with language-specific formatters
    switch (languageId) {
      case 'typescript':
      case 'javascript':
        return await this.formatJavaScript(code);
      case 'python':
        return await this.formatPython(code);
      case 'java':
        return await this.formatJava(code);
      default:
        return code; // No formatting available
    }
  }
  // Lint code for a specific language
  async lintCode(code, languageId) {
    const support = this.supportedLanguages.get(languageId);
    if (!support) {
      throw new Error(`Language ${languageId} not supported`);
    }
    // This would integrate with language-specific linters
    const results = [];
    // Common linting rules
    if (
      code.includes('console.log') &&
      (languageId === 'typescript' || languageId === 'javascript')
    ) {
      results.push({
        line: 1,
        column: 1,
        message: 'Avoid console.log in production code',
        severity: 'warning',
        rule: 'no-console',
      });
    }
    return results;
  }
  async formatJavaScript(code) {
    // Integration with Prettier or similar
    return code; // Placeholder
  }
  async formatPython(code) {
    // Integration with Black or similar
    return code; // Placeholder
  }
  async formatJava(code) {
    // Integration with Google Java Format or similar
    return code; // Placeholder
  }
}
//# sourceMappingURL=DockerAndMultiLanguage.js.map
