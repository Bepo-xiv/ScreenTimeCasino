import { addManagedApp } from '../../storage/configRepo';
import { appStorage, blockState } from '../../storage/mmkv';
import {
  addTime,
  applyHandResult,
  checkUsageAccessPermission,
  getAvailableMinutes,
  getRealUsageMinutesToday,
  getStakingStatus,
  removeTime,
  requestUsageAccessPermission,
} from '../screenTimeTracker';

const PACKAGE = 'com.test.app';

beforeEach(() => {
  appStorage.clearAll();
  blockState.clearAll();
  addManagedApp({ packageName: PACKAGE, label: 'Test App', icon: 'file:///tmp/test-icon.png', baseBudgetMinutes: 30 });
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

describe('getStakingStatus', () => {
  it('allows staking today’s balance plus one full day borrowed forward, at full budget', async () => {
    const status = await getStakingStatus(PACKAGE);
    expect(status).toEqual({ remainingMinutes: 30, maxStake: 60, locked: false, usingGrace: false });
  });

  it('grants a one-time 5-minute grace stake once the pool (today + tomorrow) drops below the minimum', async () => {
    removeTime(PACKAGE, 56); // remaining = -26, pool = -26 + 30 = 4 < MIN_STAKE
    const status = await getStakingStatus(PACKAGE);
    expect(status).toEqual({ remainingMinutes: -26, maxStake: 5, locked: false, usingGrace: true });
  });

  it('locks all further staking once the grace bet is placed and lost', async () => {
    removeTime(PACKAGE, 56); // pool = 4, grace available
    await applyHandResult(PACKAGE, 'lose', 5, false);
    const status = await getStakingStatus(PACKAGE);
    expect(status.locked).toBe(true);
    expect(status.maxStake).toBe(0);
    expect(status.usingGrace).toBe(false);
  });

  it('unlocks again if the grace bet is won back above the minimum, even though the grace was used', async () => {
    removeTime(PACKAGE, 56); // pool = 4, grace available
    await applyHandResult(PACKAGE, 'win', 5, false); // pool becomes -21 + 30 = 9 >= MIN_STAKE
    const status = await getStakingStatus(PACKAGE);
    expect(status.locked).toBe(false);
    expect(status.usingGrace).toBe(false);
    expect(status.maxStake).toBe(9);
  });

  it('forgives the balance and clears the grace flag on the next calendar day', async () => {
    removeTime(PACKAGE, 56);
    await applyHandResult(PACKAGE, 'lose', 5, false); // locked, graceUsed: true, stored under yesterday's date
    blockState.set(
      `screenTimeBalance:${PACKAGE}`,
      JSON.stringify({ date: '2000-01-01', bankedAdjustments: -61, graceUsed: true }),
    );
    const status = await getStakingStatus(PACKAGE);
    expect(status).toEqual({ remainingMinutes: 30, maxStake: 60, locked: false, usingGrace: false });
  });
});
