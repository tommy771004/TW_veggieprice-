import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { handleHistoryRevalidation } from "./historyRevalidation.ts";

const SECRET = "test-revalidation-secret";
const NOW_SECONDS = 1_776_000_000;

function signedRequest(body: string, timestamp = NOW_SECONDS): Request {
  const timestampHeader = String(timestamp);
  const signature = `sha256=${createHmac("sha256", SECRET)
    .update(`${timestampHeader}.`)
    .update(body)
    .digest("hex")}`;

  return new Request("https://example.test/api/revalidate/history", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidation-timestamp": timestampHeader,
      "x-revalidation-signature": signature,
    },
    body,
  });
}

describe("handleHistoryRevalidation", () => {
  it("does not authorize a request using the standard Date header", async () => {
    const tags: string[] = [];
    const request = new Request("https://example.test/api/revalidate/history", {
      method: "POST",
      headers: { Date: new Date(NOW_SECONDS * 1000).toUTCString() },
      body: JSON.stringify({ crop: "高麗菜" }),
    });

    const response = await handleHistoryRevalidation(request, {
      secret: SECRET,
      now: () => NOW_SECONDS * 1000,
      revalidateTag: (tag) => {
        tags.push(tag);
      },
    });

    assert.equal(response.status, 401);
    assert.deepEqual(tags, []);
  });

  it("rejects invalid and expired HMAC signatures", async () => {
    const tags: string[] = [];
    const invalid = new Request("https://example.test/api/revalidate/history", {
      method: "POST",
      headers: {
        "x-revalidation-timestamp": String(NOW_SECONDS),
        "x-revalidation-signature": `sha256=${"0".repeat(64)}`,
      },
      body: JSON.stringify({ crop: "高麗菜" }),
    });

    const invalidResponse = await handleHistoryRevalidation(invalid, {
      secret: SECRET,
      now: () => NOW_SECONDS * 1000,
      revalidateTag: (tag) => {
        tags.push(tag);
      },
    });
    const expiredResponse = await handleHistoryRevalidation(
      signedRequest(JSON.stringify({ crop: "高麗菜" }), NOW_SECONDS - 301),
      {
        secret: SECRET,
        now: () => NOW_SECONDS * 1000,
        revalidateTag: (tag) => {
          tags.push(tag);
        },
      },
    );

    assert.equal(invalidResponse.status, 401);
    assert.equal(expiredResponse.status, 401);
    assert.deepEqual(tags, []);
  });

  it("revalidates only the signed crop history tag", async () => {
    const tags: string[] = [];
    const body = JSON.stringify({ crop: " 高麗菜 " });

    const response = await handleHistoryRevalidation(signedRequest(body), {
      secret: SECRET,
      now: () => NOW_SECONDS * 1000,
      revalidateTag: (tag) => {
        tags.push(tag);
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(tags, ["history-高麗菜"]);
    assert.deepEqual(await response.json(), {
      revalidated: true,
      tag: "history-高麗菜",
    });
  });

  it("fails closed when the server secret is missing", async () => {
    const tags: string[] = [];
    const body = JSON.stringify({ crop: "高麗菜" });

    const response = await handleHistoryRevalidation(signedRequest(body), {
      secret: undefined,
      now: () => NOW_SECONDS * 1000,
      revalidateTag: (tag) => {
        tags.push(tag);
      },
    });

    assert.equal(response.status, 503);
    assert.deepEqual(tags, []);
  });
});
