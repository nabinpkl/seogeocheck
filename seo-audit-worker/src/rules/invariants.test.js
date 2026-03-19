import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_PACKS, PACKS, SORTED_RULES } from "./registry.js";

test("registry exposes the canonical packs in product order", () => {
  assert.deepEqual(
    PACKS.map((pack) => pack.id),
    [
      "reachability",
      "crawlability",
      "indexability",
      "contentVisibility",
      "metadata",
      "discovery",
    ]
  );
});

test("registered rules have unique ids and valid pack relationships", () => {
  const ids = SORTED_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length);

  const packIds = new Set(PACKS.map((pack) => pack.id));
  for (const rule of SORTED_RULES) {
    assert.equal(typeof rule.packId, "string");
    assert.equal(packIds.has(rule.packId), true);
    assert.ok(Array.isArray(rule.relatedPacks));
    for (const relatedPack of rule.relatedPacks) {
      assert.equal(packIds.has(relatedPack), true);
      assert.notEqual(relatedPack, rule.packId);
    }
  }
});

test("active packs only include packs with registered rules", () => {
  assert.deepEqual(
    ACTIVE_PACKS.map((pack) => pack.id),
    ["reachability", "crawlability", "indexability", "contentVisibility", "metadata"]
  );
});
