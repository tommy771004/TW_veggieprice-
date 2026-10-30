import { revalidateTag } from "next/cache";

// Client sets this header (see lib/api.ts) when the browser navigation type
// is "reload" — i.e. the user actually hit refresh, not a normal in-app
// fetch. On a real reload we want the underlying data re-read from disk /
// upstream instead of serving the up-to-1h unstable_cache entry.
const FRESH_RELOAD_HEADER = "x-fresh-reload";

export function bustCacheOnReload(req: Request, tags: string[]): void {
  if (req.headers.get(FRESH_RELOAD_HEADER) !== "1") return;
  for (const tag of tags) revalidateTag(tag);
}
