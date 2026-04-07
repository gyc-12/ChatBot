import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readLocale(name: "en" | "zh") {
  return JSON.parse(
    readFileSync(new URL(`./locales/${name}.json`, import.meta.url), "utf8"),
  ) as Record<string, any>;
}

test("locales no longer expose personas, identity editor, or presets namespaces", () => {
  const en = readLocale("en");
  const zh = readLocale("zh");

  for (const locale of [en, zh]) {
    assert.equal("personas" in locale, false);
    assert.equal("identityEdit" in locale, false);
    assert.equal("presets" in locale, false);
    assert.equal("personas" in locale.tabs, false);
  }
});

test("mcp locale owns import and built-in tool copy", () => {
  const en = readLocale("en");
  const zh = readLocale("zh");

  for (const locale of [en, zh]) {
    assert.equal(typeof locale.mcp.importJson, "string");
    assert.equal(typeof locale.mcp.importHint, "string");
    assert.equal(typeof locale.mcp.import, "string");
    assert.equal(typeof locale.mcp.importNoTools, "string");
    assert.equal(typeof locale.mcp.importInvalidJson, "string");
    assert.equal(typeof locale.mcp.importSuccess, "string");
    assert.equal(typeof locale.mcp.importCommandNotSupported, "string");
    assert.equal(typeof locale.mcp.builtInTools, "string");
  }
});
