import fs from "fs";
import path from "path";

// Files under public/data ship inside each deployment and only change when the
// daily data commit triggers a new deploy, so a parsed copy stays valid for the
// whole lifetime of a function instance. Fluid compute reuses warm instances
// across requests, so memoizing here turns the repeated multi-MB JSON.parse
// (the dominant Active CPU cost: ~30 daily files per produce page) into a map
// lookup. Callers must treat the returned value as read-only.
//
// ~2k rows per daily file; 48 entries covers the 30-day history window plus the
// 14-day market snapshot lookback with room for the large snapshots.
const MAX_ENTRIES = 48;
const memo = new Map<string, Promise<unknown>>();

async function readAndParse<T>(relativePath: string): Promise<T> {
  const content = await fs.promises.readFile(
    path.join(process.cwd(), "public", "data", relativePath),
    "utf-8",
  );
  return JSON.parse(content) as T;
}

/**
 * Read and parse a JSON file under public/data, memoized per instance.
 * Rejects with the original fs error (e.g. code ENOENT) when the file is missing;
 * a missing file is remembered too, since it cannot appear until the next deploy.
 */
export function readLocalDataJson<T>(relativePath: string): Promise<T> {
  // `next dev` can see files rewritten by `npm run fetch-data`; always re-read there.
  if (process.env.NODE_ENV !== "production") return readAndParse<T>(relativePath);

  const hit = memo.get(relativePath);
  if (hit) {
    // Refresh recency for LRU eviction.
    memo.delete(relativePath);
    memo.set(relativePath, hit);
    return hit as Promise<T>;
  }

  const pending = readAndParse<T>(relativePath);
  memo.set(relativePath, pending);
  pending.catch((err: NodeJS.ErrnoException) => {
    if (err?.code !== "ENOENT") memo.delete(relativePath);
  });
  while (memo.size > MAX_ENTRIES) {
    const oldest = memo.keys().next().value;
    if (oldest === undefined) break;
    memo.delete(oldest);
  }
  return pending;
}
