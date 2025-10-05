// Central shutdown manager for registering cleanup callbacks and triggering graceful shutdown
type CleanupFn = () => Promise<void> | void;

class ShutdownManager {
  private static callbacks: CleanupFn[] = [];

  static register(fn: CleanupFn) {
    this.callbacks.push(fn);
  }

  static async trigger() {
    for (const cb of this.callbacks) {
      try {
        await cb();
      } catch (err) {
        console.error('Error during shutdown callback:', err);
      }
    }
  }
}

export { ShutdownManager };
