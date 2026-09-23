import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SIGNATURE_AGE_SECONDS = 300;
const MAX_BODY_BYTES = 4_096;

type HistoryRevalidationDependencies = {
  secret: string | undefined;
  revalidateTag: (tag: string) => void | Promise<void>;
  now?: () => number;
};

function jsonResponse(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
  now: number,
): boolean {
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;
  if (!signature || !/^sha256=[a-f\d]{64}$/i.test(signature)) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  if (Math.abs(Math.floor(now / 1000) - timestampSeconds) > MAX_SIGNATURE_AGE_SECONDS) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex")}`;

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function handleHistoryRevalidation(
  request: Request,
  dependencies: HistoryRevalidationDependencies,
): Promise<Response> {
  if (!dependencies.secret) {
    return jsonResponse({ error: "Revalidation is not configured" }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request body is too large" }, 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request body is too large" }, 413);
  }

  const authenticated = isValidSignature(
    rawBody,
    request.headers.get("x-revalidation-timestamp"),
    request.headers.get("x-revalidation-signature"),
    dependencies.secret,
    (dependencies.now ?? Date.now)(),
  );
  if (!authenticated) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const crop =
    typeof payload === "object" && payload !== null && "crop" in payload
      ? String(payload.crop).trim()
      : "";
  if (!crop || crop.length > 100) {
    return jsonResponse({ error: "crop must be between 1 and 100 characters" }, 400);
  }

  const tag = `history-${crop}`;
  await dependencies.revalidateTag(tag);

  return jsonResponse({ revalidated: true, tag }, 200);
}
