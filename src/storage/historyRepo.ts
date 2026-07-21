import type { Outcome } from '../blackjack/blackjackEngine';
import { appStorage } from './mmkv';

export interface HandRecord {
  id: string;
  timestamp: number;
  packageName: string;
  stakeMinutes: number;
  doubled: boolean;
  outcome: Outcome;
  payoutMinutes: number;
  resultingRemaining: number;
}

const HISTORY_KEY = 'history';
const MAX_ENTRIES = 200;

function readAll(): HandRecord[] {
  const raw = appStorage.getString(HISTORY_KEY);
  return raw ? (JSON.parse(raw) as HandRecord[]) : [];
}

export function appendHandRecord(
  entry: Omit<HandRecord, 'id' | 'timestamp'>,
): HandRecord {
  const record: HandRecord = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const all = [record, ...readAll()].slice(0, MAX_ENTRIES);
  appStorage.set(HISTORY_KEY, JSON.stringify(all));
  return record;
}

export function getHistory(packageName?: string): HandRecord[] {
  const all = readAll();
  return packageName ? all.filter(r => r.packageName === packageName) : all;
}
