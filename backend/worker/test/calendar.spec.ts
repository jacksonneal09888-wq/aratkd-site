import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  parseHeaderMonth,
  fetchSpreadsheetTabs,
  resolveCalendarGid,
} from '../src/calendar';

const SPREADSHEET_ID = 'test-sheet-id';

const HTMLVIEW = `
items.push({name: "September", pageUrl: "https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlview/sheet?gid=749580728", gid: "749580728"});
items.push({name: "Sheet22", pageUrl: "https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlview/sheet?gid=1420787922", gid: "1420787922"});
items.push({name: "OCTOBER", pageUrl: "https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlview/sheet?gid=1191369990", gid: "1191369990"});
items.push({name: "NOVEMBER", pageUrl: "https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlview/sheet?gid=0", gid: "0"});
`;

const HEADERS: Record<string, string> = {
  '749580728': 'September 2024',
  '1420787922': 'August 2026',
  '1191369990': 'October 2026',
};

function stubFetch() {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString();
    calls.push(url);
    if (url.includes('/htmlview')) {
      return new Response(HTMLVIEW, { status: 200 });
    }
    const gidMatch = /[?&]gid=(\d+)/.exec(url);
    const gid = gidMatch?.[1] || '';
    const header = HEADERS[gid];
    if (!header) {
      return new Response('nope', { status: 400 });
    }
    return new Response(`${header},,,,,,,\n`, { status: 200 });
  }));
  return calls;
}

interface FakeState {
  resolution: { gid: string; label: string; resolved_at: string } | null;
  tabs: Map<string, { gid: string; header_year: number; header_month: number }>;
}

function fakeDb(state: FakeState) {
  return {
    prepare(sql: string) {
      if (sql.includes('FROM calendar_resolution')) {
        return { first: async () => state.resolution };
      }
      if (sql.includes('FROM calendar_tab_cache')) {
        return { all: async () => ({ results: Array.from(state.tabs.values()) }) };
      }
      if (sql.includes('INSERT INTO calendar_tab_cache')) {
        return {
          run: async (gid: string, _name: string, year: number, month: number) => {
            state.tabs.set(gid, { gid, header_year: year, header_month: month });
          },
        };
      }
      if (sql.includes('INSERT INTO calendar_resolution')) {
        return {
          run: async (_id: number, gid: string, label: string, resolvedAt: string) => {
            state.resolution = { gid, label, resolved_at: resolvedAt };
          },
        };
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  } as unknown as D1Database;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseHeaderMonth', () => {
  it('parses "September 2026"', () => {
    expect(parseHeaderMonth('September 2026')).toEqual({ year: 2026, month: 8 });
  });
  it('parses quoted headers', () => {
    expect(parseHeaderMonth('"August 2026"')).toEqual({ year: 2026, month: 7 });
  });
  it('rejects non-month headers', () => {
    expect(parseHeaderMonth('Sheet22')).toBeNull();
    expect(parseHeaderMonth('TAEKWONDO CALENDAR')).toBeNull();
    expect(parseHeaderMonth('')).toBeNull();
  });
});

describe('fetchSpreadsheetTabs', () => {
  it('parses tabs from the htmlview page and skips gid 0', async () => {
    stubFetch();
    const tabs = await fetchSpreadsheetTabs(SPREADSHEET_ID);
    expect(tabs).toEqual([
      { name: 'September', gid: '749580728' },
      { name: 'Sheet22', gid: '1420787922' },
      { name: 'OCTOBER', gid: '1191369990' },
    ]);
  });
});

describe('resolveCalendarGid', () => {
  it('picks the newest month at or before now and caches headers', async () => {
    stubFetch();
    const state: FakeState = { resolution: null, tabs: new Map() };
    const now = new Date(2026, 8, 22); // September 2026, but no September tab exists
    const resolution = await resolveCalendarGid(fakeDb(state), SPREADSHEET_ID, { now });
    expect(resolution?.gid).toBe('1420787922'); // Sheet22 = August 2026
    expect(resolution?.label).toBe('August 2026');
    expect(state.tabs.size).toBe(3); // headers cached for every tab
  });

  it('falls back to the most recent month at or before now', async () => {
    stubFetch();
    const state: FakeState = { resolution: null, tabs: new Map() };
    const now = new Date(2026, 8, 22); // September 2026, no September tab
    const resolution = await resolveCalendarGid(fakeDb(state), SPREADSHEET_ID, { now });
    expect(resolution?.gid).toBe('1420787922'); // Sheet22 = August 2026
    expect(resolution?.label).toBe('August 2026');
  });

  it('excludes future months', async () => {
    stubFetch();
    const state: FakeState = { resolution: null, tabs: new Map() };
    const now = new Date(2026, 6, 15); // July 2026 — Aug/Oct 2026 tabs are in the future
    const resolution = await resolveCalendarGid(fakeDb(state), SPREADSHEET_ID, { now });
    expect(resolution?.gid).toBe('749580728'); // September 2024 is the only past tab
  });

  it('serves a fresh cache without hitting Google', async () => {
    const calls = stubFetch();
    const state: FakeState = {
      resolution: { gid: '1420787922', label: 'August 2026', resolved_at: new Date(2026, 8, 22, 1).toISOString() },
      tabs: new Map([['1420787922', { gid: '1420787922', header_year: 2026, header_month: 7 }]]),
    };
    const now = new Date(2026, 8, 22, 2); // 1h old cache, still September
    const resolution = await resolveCalendarGid(fakeDb(state), SPREADSHEET_ID, { now });
    expect(resolution?.gid).toBe('1420787922');
    expect(calls).toHaveLength(0);
  });

  it('re-resolves on cron (force) when the cached month is stale', async () => {
    const calls = stubFetch();
    const state: FakeState = {
      resolution: { gid: '1420787922', label: 'August 2026', resolved_at: new Date(2026, 8, 22, 1).toISOString() },
      tabs: new Map(),
    };
    const now = new Date(2026, 8, 22, 2);
    const resolution = await resolveCalendarGid(fakeDb(state), SPREADSHEET_ID, { now, force: true });
    expect(resolution?.gid).toBe('1420787922');
    expect(calls.some((u) => u.includes('/htmlview'))).toBe(true);
  });
});
