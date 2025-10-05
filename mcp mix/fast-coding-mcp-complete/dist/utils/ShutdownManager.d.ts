type CleanupFn = () => Promise<void> | void;
declare class ShutdownManager {
  private static callbacks;
  static register(fn: CleanupFn): void;
  static trigger(): Promise<void>;
}
export { ShutdownManager };
//# sourceMappingURL=ShutdownManager.d.ts.map
