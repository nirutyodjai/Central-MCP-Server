export declare class DockerManager {
  private projectRoot;
  private composeFile;
  private dockerfile;
  constructor(projectRoot?: string);
  generateDockerfile(options?: DockerOptions): string;
  generateDockerCompose(options?: DockerComposeOptions): string;
  generateDockerIgnore(): string;
  createDeploymentFiles(options?: DockerOptions): Promise<void>;
  buildImage(tag?: string): Promise<void>;
  deploy(): Promise<void>;
}
export declare class MultiLanguageManager {
  private supportedLanguages;
  private languageDetectors;
  constructor();
  private initializeLanguageSupport;
  private setupLanguageDetectors;
  detectLanguage(filePath: string): Promise<string | null>;
  getLanguageSupport(languageId: string): LanguageSupport | null;
  getSupportedLanguages(): LanguageSupport[];
  isLanguageSupported(languageId: string): boolean;
  getSupportedExtensions(): string[];
  formatCode(code: string, languageId: string): Promise<string>;
  lintCode(code: string, languageId: string): Promise<LintResult[]>;
  private formatJavaScript;
  private formatPython;
  private formatJava;
}
interface DockerOptions {
  nodeVersion?: string;
  port?: number;
  managementPort?: number;
  wsPort?: number;
  baseImage?: string;
}
interface DockerComposeOptions {
  mcpPort?: number;
  managementPort?: number;
  wsPort?: number;
  databasePath?: string;
  restartPolicy?: string;
  networks?: string[];
}
interface LanguageSupport {
  name: string;
  extensions: string[];
  features: string[];
  tools: string[];
  aiModels: string[];
}
interface LintResult {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
}
export {};
//# sourceMappingURL=DockerAndMultiLanguage.d.ts.map
