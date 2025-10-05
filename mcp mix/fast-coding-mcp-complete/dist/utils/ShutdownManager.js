class ShutdownManager {
  static register(fn) {
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
ShutdownManager.callbacks = [];
export { ShutdownManager };
//# sourceMappingURL=ShutdownManager.js.map
