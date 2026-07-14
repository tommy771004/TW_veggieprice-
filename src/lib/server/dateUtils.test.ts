import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rocToISO } from "./dateUtils.ts";

describe("rocToISO", () => {
  it("parses dotted ROC dates", () => {
    assert.equal(rocToISO("115.07.08"), "2026-07-08");
  });

  it("parses compact ROC YYYMMDD used by seafood/pork feeds", () => {
    assert.equal(rocToISO("1150708"), "2026-07-08");
    assert.equal(rocToISO("1150701"), "2026-07-01");
  });

  it("returns empty for invalid input", () => {
    assert.equal(rocToISO(""), "");
    assert.equal(rocToISO("not-a-date"), "");
  });
});
