export declare class MonitoringSystem {
  private metrics;
  private alerts;
  private subscribers;
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void;
  subscribe(callback: (data: any) => void): () => void;
  getMetrics(name?: string, startTime?: number, endTime?: number): any[];
  getAlerts(): Alert[];
  createAlert(alert: Alert): void;
  private checkAlerts;
  private shouldTriggerAlert;
  private triggerAlert;
  private calculateStatistics;
  private notifySubscribers;
}
export declare class CodeIntelligence {
  private codeIndex;
  private patterns;
  analyzeCode(
    filePath: string,
    content: string,
    language: string
  ): Promise<CodeIntelligenceData>;
  findPatterns(content: string, language: string): Promise<PatternMatch[]>;
  suggestImprovements(
    filePath: string,
    content: string,
    language: string
  ): Promise<CodeSuggestion[]>;
  private extractFunctions;
  private extractClasses;
  private extractImports;
  private extractExports;
  private calculateComplexity;
  private calculateMaintainability;
  private getLineNumber;
  private matchPattern;
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
export {};
//# sourceMappingURL=AdvancedFeatures.d.ts.map
