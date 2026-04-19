const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const { performanceIndexes, supportObjects } = require("./sqlite_support_config");

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function resolveDbPath() {
  const explicitPath = getArgValue("--db") || process.env.GB64_SQLITE_PATH;
  return path.resolve(explicitPath || path.join(__dirname, "..", "gb64.sqlite"));
}

function sqliteObjectExists(db, name, type) {
  return Boolean(
    db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1"
    ).get(type, name)
  );
}

function tableExists(db, tableName) {
  return sqliteObjectExists(db, tableName, "table");
}

function listMissingIndexes(db) {
  const missing = [];

  for (const [tableName, indexName] of performanceIndexes) {
    if (!tableExists(db, tableName)) {
      continue;
    }

    if (!sqliteObjectExists(db, indexName, "index")) {
      missing.push(indexName);
    }
  }

  return missing;
}

function listMissingSupportObjects(db) {
  return supportObjects
    .filter(({ name, type }) => !sqliteObjectExists(db, name, type))
    .map(({ name, type }) => `${name} (${type})`);
}

function listFtsShadowTables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name GLOB 'GameSearchIndex_*' ORDER BY name"
    )
    .all()
    .map((row) => row.name);
}

function main() {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`[ERROR] SQLite database not found at ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    const missingIndexes = listMissingIndexes(db);
    const missingSupportObjects = listMissingSupportObjects(db);
    const shadowTables = listFtsShadowTables(db);

    console.log(`Auditing SQLite support objects in ${dbPath}`);
    console.log(`Expected performance indexes: ${performanceIndexes.length}`);
    console.log(`Expected support objects: ${supportObjects.length}`);
    console.log(`FTS shadow tables detected: ${shadowTables.length}`);

    if (shadowTables.length > 0) {
      console.log(`FTS shadow tables: ${shadowTables.join(", ")}`);
    }

    if (missingIndexes.length === 0 && missingSupportObjects.length === 0) {
      console.log("[OK] All expected indexes and support objects are present.");
      return;
    }

    if (missingIndexes.length > 0) {
      console.error(`[ERROR] Missing indexes: ${missingIndexes.join(", ")}`);
    }

    if (missingSupportObjects.length > 0) {
      console.error(
        `[ERROR] Missing support objects: ${missingSupportObjects.join(", ")}`
      );
    }

    process.exit(1);
  } finally {
    db.close();
  }
}

main();
