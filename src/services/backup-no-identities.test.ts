import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function installLocalStorage() {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
}

test("createBackup no longer exports identities", async () => {
  const storage = installLocalStorage();
  storage.setItem("ChatBot:providers", JSON.stringify([{ id: "provider-1" }]));
  storage.setItem("ChatBot:models", JSON.stringify([{ id: "model-1" }]));
  storage.setItem("ChatBot:identities", JSON.stringify([{ id: "identity-1" }]));
  storage.setItem("ChatBot:mcp_servers", JSON.stringify([{ id: "server-1" }]));
  storage.setItem("ChatBot:settings", JSON.stringify({ theme: "light" }));

  const { createBackup } = await import("./backup.ts");
  const backup = createBackup() as Record<string, unknown>;

  assert.equal("identities" in backup, false);
  assert.deepEqual(backup.providers, [{ id: "provider-1" }]);
  assert.deepEqual(backup.models, [{ id: "model-1" }]);
  assert.deepEqual(backup.mcpServers, [{ id: "server-1" }]);
});

test("importBackupFromString ignores legacy identities payloads", async () => {
  const storage = installLocalStorage();
  const { importBackupFromString } = await import("./backup.ts");

  const result = importBackupFromString(
    JSON.stringify({
      version: "2.0",
      exportedAt: "2026-04-07T12:00:00.000Z",
      providers: [{ id: "provider-1" }],
      models: [{ id: "model-1" }],
      identities: [{ id: "identity-1" }],
      mcpServers: [{ id: "server-1" }],
      settings: { theme: "dark" },
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.counts?.providers, 1);
  assert.equal(result.counts?.models, 1);
  assert.equal(result.counts?.mcpServers, 1);
  assert.equal("identities" in (result.counts ?? {}), false);
  assert.equal(storage.getItem("ChatBot:identities"), null);
});
