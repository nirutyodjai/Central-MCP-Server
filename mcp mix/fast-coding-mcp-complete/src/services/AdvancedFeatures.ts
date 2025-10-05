// Real-time monitoring and analytics system
export class MonitoringSystem {
  private metrics: Map<string, MetricData> = new Map();
  private alerts: Alert[] = [];
  private subscribers: Set<(data: any) => void> = new Set();

  // Record metric
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const key = `${name}:${JSON.stringify(tags || {})}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        name,
        values: [],
        timestamps: [],
        tags: tags || {},
      });
    }

    const metric = this.metrics.get(key)!;
    metric.values.push(value);
    metric.timestamps.push(Date.now());

    // Keep only last 1000 data points
    if (metric.values.length > 1000) {
      metric.values.shift();
      metric.timestamps.shift();
    }

    // Check for alerts
    this.checkAlerts(name, value, tags);

    // Notify subscribers
    this.notifySubscribers({
      type: 'metric',
      name,
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  // Subscribe to real-time updates
  subscribe(callback: (data: any) => void): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Get metrics for time range
  getMetrics(name?: string, startTime?: number, endTime?: number) {
    const end = endTime || Date.now();
    const start = startTime || end - 3600000; // Last hour

    const results: any[] = [];

    for (const [key, metric] of this.metrics) {
      if (name && !key.startsWith(name)) continue;

      const filteredValues = [];
      const filteredTimestamps = [];

      for (let i = 0; i < metric.timestamps.length; i++) {
        if (metric.timestamps[i] >= start && metric.timestamps[i] <= end) {
          filteredValues.push(metric.values[i]);
          filteredTimestamps.push(metric.timestamps[i]);
        }
      }

      if (filteredValues.length > 0) {
        results.push({
          name: metric.name,
          tags: metric.tags,
          values: filteredValues,
          timestamps: filteredTimestamps,
          statistics: this.calculateStatistics(filteredValues),
        });
      }
    }

    return results;
  }

  // Get current alerts
  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  // Create alert rule
  createAlert(alert: Alert) {
    this.alerts.push(alert);
  }

  private checkAlerts(
    name: string,
    value: number,
    tags?: Record<string, string>
  ) {
    for (const alert of this.alerts) {
      if (this.shouldTriggerAlert(alert, name, value, tags)) {
        this.triggerAlert(alert, value, tags);
      }
    }
  }

  private shouldTriggerAlert(
    alert: Alert,
    name: string,
    value: number,
    tags?: Record<string, string>
  ): boolean {
    if (alert.metricName !== name) return false;

    switch (alert.condition) {
      case 'greater_than':
        return value > alert.threshold;
      case 'less_than':
        return value < alert.threshold;
      case 'equals':
        return Math.abs(value - alert.threshold) < 0.001;
      default:
        return false;
    }
  }

  private triggerAlert(
    alert: Alert,
    value: number,
    tags?: Record<string, string>
  ) {
    const alertInstance = {
      id: `alert_${Date.now()}_${Math.random()}`,
      alertId: alert.id,
      message: `Alert triggered: ${alert.metricName} ${alert.condition} ${alert.threshold} (current: ${value})`,
      severity: alert.severity,
      timestamp: Date.now(),
      value,
      tags: tags || {},
    };

    this.notifySubscribers({ type: 'alert', alert: alertInstance });
  }

  private calculateStatistics(values: number[]) {
    if (values.length === 0) return {};

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      average: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  private notifySubscribers(data: any) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }
}

// Advanced code intelligence features
export class CodeIntelligence {
  private codeIndex: Map<string, CodeIntelligenceData> = new Map();
  private patterns: Map<string, Pattern> = new Map();

  // Analyze code and extract intelligence
  async analyzeCode(filePath: string, content: string, language: string) {
    const analysis: CodeIntelligenceData = {
      filePath,
      language,
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: [],
      complexity: 0,
      maintainability: 0,
      testCoverage: 0,
      lastAnalyzed: Date.now(),
    };

    // Extract functions
    analysis.functions = this.extractFunctions(content, language);

    // Extract classes
    analysis.classes = this.extractClasses(content, language);

    // Extract imports/exports
    analysis.imports = this.extractImports(content, language);
    analysis.exports = this.extractExports(content, language);

    // Calculate complexity
    analysis.complexity = this.calculateComplexity(content, language);

    // Calculate maintainability
    analysis.maintainability = this.calculateMaintainability(analysis);

    this.codeIndex.set(filePath, analysis);

    return analysis;
  }

  // Find code patterns and suggest improvements
  async findPatterns(
    content: string,
    language: string
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    for (const [patternId, pattern] of this.patterns) {
      if (pattern.language === language || pattern.language === 'all') {
        const patternMatches = this.matchPattern(content, pattern);
        matches.push(
          ...patternMatches.map(match => ({
            patternId,
            pattern: pattern.name,
            line: match.line,
            column: match.column,
            suggestion: match.suggestion,
            confidence: match.confidence,
          }))
        );
      }
    }

    return matches;
  }

  // Suggest code improvements
  async suggestImprovements(
    filePath: string,
    content: string,
    language: string
  ) {
    const analysis = this.codeIndex.get(filePath);
    if (!analysis) {
      await this.analyzeCode(filePath, content, language);
    }

    const suggestions: CodeSuggestion[] = [];

    // Complexity suggestions
    if (analysis.complexity > 10) {
      suggestions.push({
        type: 'complexity',
        message:
          'Function is too complex. Consider breaking it into smaller functions.',
        line: 0,
        severity: 'warning',
        suggestion: 'Refactor into smaller, more focused functions',
      });
    }

    // Pattern-based suggestions
    const patterns = await this.findPatterns(content, language);
    suggestions.push(
      ...patterns.map(pattern => ({
        type: 'pattern',
        message: `Pattern found: ${pattern.pattern}`,
        line: pattern.line,
        severity: 'info' as const,
        suggestion: pattern.suggestion,
      }))
    );

    return suggestions;
  }

  private extractFunctions(content: string, language: string): FunctionInfo[] {
    // Language-specific function extraction
    const functions: FunctionInfo[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const functionRegex =
        /function\s+(\w+)|(\w+)\s*=\s*\([^)]*\)\s*=>|(\w+)\s*\([^)]*\)\s*{/g;
      let match;

      while ((match = functionRegex.exec(content)) !== null) {
        functions.push({
          name: match[1] || match[2] || match[3],
          line: this.getLineNumber(content, match.index),
          parameters: [],
          returnType: 'any',
          complexity: 1,
        });
      }
    }

    return functions;
  }

  private extractClasses(content: string, language: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const classRegex = /class\s+(\w+)|interface\s+(\w+)/g;
      let match;

      while ((match = classRegex.exec(content)) !== null) {
        classes.push({
          name: match[1] || match[2],
          line: this.getLineNumber(content, match.index),
          methods: [],
          properties: [],
          extends: null,
          implements: [],
        });
      }
    }

    return classes;
  }

  private extractImports(content: string, language: string): string[] {
    const imports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  private extractExports(content: string, language: string): string[] {
    const exports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const exportRegex =
        /export\s+(?:const|let|var|function|class|interface)\s+(\w+)/g;
      let match;

      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    return exports;
  }

  private calculateComplexity(content: string, language: string): number {
    // Simple complexity calculation based on control structures
    let complexity = 1;

    const controlStructures = [
      'if',
      'else if',
      'for',
      'while',
      'switch',
      'case',
      'catch',
      '&&',
      '||',
      '?',
    ];
    controlStructures.forEach(struct => {
      const regex = new RegExp(`\\b${struct}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateMaintainability(analysis: CodeIntelligenceData): number {
    // Simple maintainability score based on complexity and size
    const complexityScore = Math.max(0, 100 - analysis.complexity * 5);
    const sizeScore = Math.max(0, 100 - analysis.functions.length * 2);

    return (complexityScore + sizeScore) / 2;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private matchPattern(
    content: string,
    pattern: Pattern
  ): Array<{
    line: number;
    column: number;
    suggestion: string;
    confidence: number;
  }> {
    const matches = [];
    // Pattern matching implementation
    return matches;
  }
}

// Types for advanced features
interface MetricData {
  name: string;
  values: number[];
  timestamps: number[];
  tags: Record<string, string>;
}

interface Alert {
  id: string;
  metricName: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  enabled: boolean;
}

interface CodeIntelligenceData {
  filePath: string;
  language: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: string[];
  exports: string[];
  dependencies: string[];
  complexity: number;
  maintainability: number;
  testCoverage: number;
  lastAnalyzed: number;
}

interface FunctionInfo {
  name: string;
  line: number;
  parameters: string[];
  returnType: string;
  complexity: number;
}

interface ClassInfo {
  name: string;
  line: number;
  methods: string[];
  properties: string[];
  extends: string | null;
  implements: string[];
}

interface Pattern {
  id: string;
  name: string;
  language: string;
  pattern: string;
  suggestion: string;
}

interface PatternMatch {
  patternId: string;
  pattern: string;
  line: number;
  column: number;
  suggestion: string;
  confidence: number;
}

interface CodeSuggestion {
  type: 'complexity' | 'pattern' | 'security' | 'performance';
  message: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  suggestion: string;
}
