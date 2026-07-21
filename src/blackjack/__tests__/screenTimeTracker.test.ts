import { addManagedApp } from '../../storage/configRepo';
import { appStorage, blockState } from '../../storage/mmkv';
import {
  addTime,
  applyHandResult,
  checkUsageAccessPermission,
  getAvailableMinutes,
  getRealUsageMinutesToday,
  removeTime,
  requestUsageAccessPermission,
} from '../screenTimeTracker';

const PACKAGE = 'com.test.app';

beforeEach(() => {
  appStorage.clearAll();
  blockState.clearAll();
  addManagedApp({ packageName: PACKAGE, label: 'Test App', icon: '🧪', baseBudgetMinutes: 30 });
});

describe('non-Android platforms (and the Jest test environment)', () => {
  it('never grants usage access', async () => {
    await expect(checkUsageAccessPermission()).resolves.toBe(false);
  });

  it('does not throw when asked to open settings', () => {
    expect(() => requestUsageAccessPermission()).not.toThrow();
  });

  it('reports zero real usage', async () => {
    await expect(getRealUsageMinutesToday(PACKAGE)).resolves.toBe(0);
  });
});

describe('getAvailableMinutes', () => {
  it('starts at the app’s configured base budget', async () => {
    await expect(getAvailableMinutes(PACKAGE)).resolves.toBe(30);
  });
});

describe('addTime / removeTime', () => {
  it('increases the available balance', async () => {
    addTime(PACKAGE, 10);
    await expect(getAvailableMinutes(PACKAGE)).resolves.toBe(40);
  });

  it('decreases the available balance', async () => {
    removeTime(PACKAGE, 10);
    await expect(getAvailableMinutes(PACKAGE)).resolves.toBe(20);
  });

  it('accumulates across multiple calls', async () => {
    addTime(PACKAGE, 10);
    removeTime(PACKAGE, 5);
    addTime(PACKAGE, 2);
    await expect(getAvailableMinutes(PACKAGE)).resolves.toBe(37);
  });
});

describe('applyHandResult', () => {
  it('adds the stake on a win (1:1)', async () => {
    const result = await applyHandResult(PACKAGE, 'win', 10, false);
    expect(result.payoutMinutes).toBe(10);
    expect(result.remainingMinutes).toBe(40);
  });

  it('adds 1.5x the stake on blackjack', async () => {
    const result = await applyHandResult(PACKAGE, 'blackjack', 10, false);
    expect(result.payoutMinutes).toBe(15);
    expect(result.remainingMinutes).toBe(45);
  });

  it('removes the stake on a loss', async () => {
    const result = await applyHandResult(PACKAGE, 'lose', 10, false);
    expect(result.payoutMinutes).toBe(-10);
    expect(result.remainingMinutes).toBe(20);
  });

  it('leaves the balance untouched on a push', async () => {
    const result = await applyHandResult(PACKAGE, 'push', 10, false);
    expect(result.payoutMinutes).toBe(0);
    expect(result.remainingMinutes).toBe(30);
  });

  it('doubles the effective stake when the hand was doubled', async () => {
    const result = await applyHandResult(PACKAGE, 'lose', 10, true);
    expect(result.payoutMinutes).toBe(-20);
    expect(result.remainingMinutes).toBe(10);
  });
});
