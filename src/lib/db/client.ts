import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "@/lib/config";
import { MIGRATIONS } from "./migrations";

// Reuse one connection. In development Next.js reloads modules often, so the
// connection is stored on globalThis to avoid opening a new one each reload.
const globalForDb = globalThis as unknown as { dropLabDb?: Database.Database };

function openDatabase(): Database.Database {
  // The database path is configurable, so tell the bundler not to try to trace it.
  const dbPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.database.path);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database): void {
  const applied = db.pragma("user_version", { simple: true }) as number;
  for (let version = applied; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

export function getDb(): Database.Database {
  globalForDb.dropLabDb ??= openDatabase();
  return globalForDb.dropLabDb;
}
