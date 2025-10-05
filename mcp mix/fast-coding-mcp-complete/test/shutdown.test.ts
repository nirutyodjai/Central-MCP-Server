import { describe, it, expect, vi } from 'vitest';
import { ShutdownManager } from '../src/utils/ShutdownManager';

describe('ShutdownManager', () => {
  it('calls registered cleanup functions', async () => {
    const mockCleanup = vi.fn(async () => Promise.resolve());

    ShutdownManager.register(mockCleanup);

    await ShutdownManager.trigger();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('handles synchronous cleanup functions', async () => {
    const mockSync = vi.fn(() => {
      /* sync cleanup */
    });

    ShutdownManager.register(mockSync);

    await ShutdownManager.trigger();

    expect(mockSync).toHaveBeenCalled();
  });
});
