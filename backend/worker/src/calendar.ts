/**
 * Calendar watcher — keeps the site's class calendar in sync automatically.
 *
 * The school posts each month as a new tab inside one Google Sheet, and tab
 * names are unreliable ('Sheet22' held August 2026, while a tab named
 * 'September' was a 2024 leftover). So instead of trusting names, we read the
 * first cell of each tab's CSV ("August 2026", "September 2026", ...) and pick
 * the tab matching the current month — falling back to the most recent month
 * at or before now. Results are cached in D1 so routine requests never hammer
 * Google; new tabs are discovered by the cron sweep or on the next request
 * once the cached month goes stale.
 */

export interface CalendarTab {
  name: string;
  gid: string;
}

export interface CalendarResolution {
  gid: string;
  label: string;
  resolvedAt: string;
}

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const RESOLUTION_TTL_MS = 6 * 3600_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; aratkd-calendar-watcher/1.0)';

interface HeaderMonth {
  year: number;
  month: number;
}

/** Parse a tab header like "September 2026" (surrounding quotes tolerated). */
export function parseHeaderMonth(header: string): HeaderMonth | null {
  const cleaned = (header || '').replace(/^["'\s]+|["'\s]+$/g, '');
  const match = /^([A-Za-z]+)\s+(20\d{2})/.exec(cleaned);
  if (!match) {
    return null;
  }
  const month = MONTH_INDEX[match[1].toLowerCase()];
  if (month === undefined) {
    return null;
  }
  return { year: Number(match[2]), month };
}

/** Enumerate a public spreadsheet's tabs by scraping its htmlview page. */
export async function fetchSpreadsheetTabs(spreadsheetId: string): Promise<CalendarTab[]> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`spreadsheet tab list fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const tabs: CalendarTab[] = [];
  const re = /items\.push\(\{name: "((?:[^"\\]|\\.)*)"[^{}]*?gid: "(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const gid = match[2];
    if (gid === '0' || tabs.some((tab) => tab.gid === gid)) {
      continue;
    }
    const name = match[1].replace(/\\x27/g, "'").replace(/\\"/g, '"');
    tabs.push({ name, gid });
  }
  return tabs;
}

/** Read just the header cell of a tab's CSV export to learn its month. */
export async function fetchTabHeaderMonth(
  spreadsheetId: string,
  gid: string
): Promise<HeaderMonth | null> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
    { headers: { 'User-Agent': USER_AGENT } }
  );
  if (!res.ok) {
    return null;
  }
  const text = await res.text();
  const firstLine = (text.split(/\r?\n/, 1)[0] || '').replace(/^"+|"+$/g, '');
  const firstCell = (firstLine.split(',')[0] || '').replace(/^"+|"+$/g, '');
  return parseHeaderMonth(firstCell);
}

function monthKey(value: HeaderMonth): number {
  return value.year * 12 + value.month;
}

interface CachedResolutionRow {
  gid: string;
  label: string;
  resolved_at: string;
}

/**
 * Resolve the gid of the spreadsheet tab for the current month.
 *
 * - Serves from the D1 cache when fresh (unless the cached month no longer
 *   matches the current month, in which case we re-check for a newer tab).
 * - `force` bypasses the TTL (used by cron); tab headers themselves are
 *   cached forever, so a forced sweep only fetches headers for tabs it has
 *   never seen.
 */
export async function resolveCalendarGid(
  db: D1Database,
  spreadsheetId: string,
  options: { force?: boolean; now?: Date } = {}
): Promise<CalendarResolution | null> {
  const now = options.now || new Date();
  const current: HeaderMonth = { year: now.getFullYear(), month: now.getMonth() };

  const cached = await db
    .prepare('SELECT gid, label, resolved_at FROM calendar_resolution WHERE id = 1')
    .first<CachedResolutionRow>();

  const fresh =
    cached !== null &&
    now.getTime() - new Date(cached.resolved_at).getTime() < RESOLUTION_TTL_MS;
  const cachedHeader = cached ? parseHeaderMonth(cached.label) : null;
  const cachedMatchesCurrent =
    cachedHeader !== null &&
    cachedHeader.year === current.year &&
    cachedHeader.month === current.month;

  if (cached && fresh && (cachedMatchesCurrent || !options.force)) {
    return { gid: cached.gid, label: cached.label, resolvedAt: cached.resolved_at };
  }

  try {
    const tabs = await fetchSpreadsheetTabs(spreadsheetId);
    if (!tabs.length) {
      return cached ? { gid: cached.gid, label: cached.label, resolvedAt: cached.resolved_at } : null;
    }

    const knownRows = await db
      .prepare('SELECT gid, header_year, header_month FROM calendar_tab_cache')
      .all<{ gid: string; header_year: number; header_month: number }>();
    const known = new Map(
      (knownRows.results || []).map((row) => [
        row.gid,
        { year: row.header_year, month: row.header_month } as HeaderMonth,
      ])
    );

    const headers = new Map<string, HeaderMonth | null>(known);
    const unknown = tabs.filter((tab) => !known.has(tab.gid));
    for (let index = 0; index < unknown.length; index += 4) {
      const batch = unknown.slice(index, index + 4);
      const results = await Promise.all(
        batch.map(async (tab) => {
          const header = await fetchTabHeaderMonth(spreadsheetId, tab.gid);
          return { tab, header };
        })
      );
      for (const { tab, header } of results) {
        headers.set(tab.gid, header);
        if (header) {
          await db
            .prepare(
              `INSERT INTO calendar_tab_cache (gid, tab_name, header_year, header_month, checked_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(gid) DO UPDATE SET
                 tab_name = excluded.tab_name,
                 header_year = excluded.header_year,
                 header_month = excluded.header_month,
                 checked_at = excluded.checked_at`
            )
            .run(tab.gid, tab.name, header.year, header.month, now.toISOString());
        }
      }
    }

    let best: { gid: string; header: HeaderMonth } | null = null;
    for (const tab of tabs) {
      const header = headers.get(tab.gid);
      if (!header) {
        continue;
      }
      if (monthKey(header) > monthKey(current)) {
        continue; // future month — not posted yet
      }
      if (!best || monthKey(header) > monthKey(best.header)) {
        best = { gid: tab.gid, header };
      }
    }

    if (!best) {
      return cached ? { gid: cached.gid, label: cached.label, resolvedAt: cached.resolved_at } : null;
    }

    const label = `${MONTH_NAMES[best.header.month]} ${best.header.year}`;
    await db
      .prepare(
        `INSERT INTO calendar_resolution (id, gid, label, resolved_at)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           gid = excluded.gid,
           label = excluded.label,
           resolved_at = excluded.resolved_at`
      )
      .run(best.gid, label, now.toISOString());

    return { gid: best.gid, label, resolvedAt: now.toISOString() };
  } catch (error) {
    if (cached) {
      return { gid: cached.gid, label: cached.label, resolvedAt: cached.resolved_at };
    }
    throw error;
  }
}
