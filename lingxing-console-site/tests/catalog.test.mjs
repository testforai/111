import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../generated/endpoints.json" with { type: "json" };
test("catalog covers the complete upstream surface", () => {
  assert.ok(catalog.endpointCount >= 590, "expected at least 590 callable endpoints");
  assert.equal(catalog.moduleCount, 20);
  assert.ok(catalog.endpoints.every((item) => item.id && item.route && item.method));
});
