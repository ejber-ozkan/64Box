const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const Database = require("better-sqlite3");

const { performanceIndexes, supportObjects } = require("./sqlite_support_config");

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function resolvePath(flag, envVar, fallbackPath) {
  const explicitPath = getArgValue(flag) || process.env[envVar];
  return path.resolve(explicitPath || fallbackPath);
}

const outputDir = resolvePath("--input-dir", "GB64_EXPORT_DIR", path.join(__dirname, "../gb64_export"));
const dbPath = resolvePath("--db", "GB64_SQLITE_PATH", path.join(__dirname, "../gb64.sqlite"));

console.log(`Importing CSV files from ${outputDir}`);
console.log(`Connecting to database at ${dbPath}...`);
const db = new Database(dbPath);

function tableExists(tableName) {
  return Boolean(
    db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    ).get(tableName)
  );
}

function sqliteObjectExists(name, type) {
  return Boolean(
    db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1"
    ).get(type, name)
  );
}

function createPerformanceIndexes() {
  console.log("Creating performance indexes...");
  for (const [tableName, , sql] of performanceIndexes) {
    if (tableExists(tableName)) {
      db.exec(sql);
    }
  }
}

function rebuildCoverIndex() {
  console.log("Creating cover lookup table...");
  db.exec("DROP TABLE IF EXISTS GameCoverIndex");
  db.exec(`
    CREATE TABLE GameCoverIndex AS
    SELECT
      GA_Id,
      MIN(Path) as cover_path
    FROM Extras
    WHERE LOWER(REPLACE(Path, '\\\\', '/')) LIKE 'cover/%'
      AND (
        LOWER(Path) LIKE '%.jpg'
        OR LOWER(Path) LIKE '%.jpeg'
        OR LOWER(Path) LIKE '%.png'
        OR LOWER(Path) LIKE '%.webp'
        OR LOWER(Path) LIKE '%.gif'
        OR LOWER(Path) LIKE '%.bmp'
      )
    GROUP BY GA_Id
  `);
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_game_cover_index_ga_id ON GameCoverIndex(GA_Id)"
  );
}

function rebuildSearchIndex() {
  console.log("Creating full-text search index...");
  db.exec("DROP TABLE IF EXISTS GameSearchIndex");
  db.exec(`
    CREATE VIRTUAL TABLE GameSearchIndex USING fts5(
      id UNINDEXED,
      name,
      developer_name,
      publisher_name,
      musician_name,
      coder_name,
      graphics_name,
      tokenize='porter unicode61 remove_diacritics 2',
      prefix='2,3'
    )
  `);
  db.exec(`
    INSERT INTO GameSearchIndex (
      id,
      name,
      developer_name,
      publisher_name,
      musician_name,
      coder_name,
      graphics_name
    )
    SELECT
      gv.id,
      gv.name,
      ifnull(gv.developer_name, ''),
      ifnull(gv.publisher_name, ''),
      ifnull(gv.musician_name, ''),
      ifnull(pr.Programmer, ''),
      ifnull(ar.Artist, '')
    FROM GameView gv
    JOIN Games g ON gv.id = g.GA_Id
    LEFT JOIN Programmers pr ON g.PR_Id = pr.PR_Id
    LEFT JOIN Artists ar ON g.AR_Id = ar.AR_Id
  `);
  db.exec("INSERT INTO GameSearchIndex(GameSearchIndex) VALUES('optimize')");
}

function optimizeDatabase() {
  console.log("Running ANALYZE and PRAGMA optimize...");
  db.exec("ANALYZE");
  db.pragma("optimize");
}

function verifySupportObjects() {
  const missingIndexes = [];
  for (const [tableName, indexName] of performanceIndexes) {
    if (!tableExists(tableName)) {
      continue;
    }

    if (!sqliteObjectExists(indexName, "index")) {
      missingIndexes.push(indexName);
    }
  }

  const missingSupportObjects = supportObjects
    .filter(({ name, type }) => !sqliteObjectExists(name, type))
    .map(({ name, type }) => `${name} (${type})`);

  if (missingIndexes.length > 0 || missingSupportObjects.length > 0) {
    const messages = [];
    if (missingIndexes.length > 0) {
      messages.push(`Missing indexes: ${missingIndexes.join(", ")}`);
    }
    if (missingSupportObjects.length > 0) {
      messages.push(`Missing support objects: ${missingSupportObjects.join(", ")}`);
    }
    throw new Error(messages.join("\n"));
  }
}

db.pragma("journal_mode = WAL");

if (!fs.existsSync(outputDir)) {
  throw new Error(`CSV export directory was not found: ${outputDir}`);
}

const csvFiles = fs
  .readdirSync(outputDir)
  .filter((fileName) => fileName.endsWith(".csv"))
  .sort();

console.log(`Found ${csvFiles.length} CSV files to import.`);

for (const file of csvFiles) {
  const tableName = path.basename(file, ".csv");
  const csvFile = path.join(outputDir, file);

  console.log(`Importing ${tableName}...`);

  const fileContent = fs.readFileSync(csvFile, "utf8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  if (records.length === 0) {
    console.warn(`Skipping ${tableName}, no records found.`);
    continue;
  }

  db.exec(`DROP TABLE IF EXISTS "${tableName}"`);

  const columns = Object.keys(records[0]);
  const colsDef = columns.map((columnName) => `"${columnName}" TEXT`).join(", ");

  db.exec(`CREATE TABLE "${tableName}" (${colsDef})`);

  const insertSql = `INSERT INTO "${tableName}" (${columns
    .map((columnName) => `"${columnName}"`)
    .join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  const stmt = db.prepare(insertSql);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(columns.map((columnName) => row[columnName] || ""));
    }
  });

  try {
    insertMany(records);
    console.log(`Successfully imported ${records.length} records into ${tableName}.`);
  } catch (error) {
    console.error(`Error importing ${tableName}:`, error.message);
    throw error;
  }
}

console.log("Creating optimized views...");
createPerformanceIndexes();
if (tableExists("Extras")) {
  rebuildCoverIndex();
}

db.exec("DROP VIEW IF EXISTS GameView");
db.exec(`
CREATE VIEW GameView AS
SELECT
  g.GA_Id as id,
  g.Name as name,
  g.Filename as filename,
  CASE WHEN ifnull(g.FileToRun, '') != '' THEN g.FileToRun ELSE g.Filename END as gameFilename,
  g.ScrnshotFilename as screenshotFilename,
  NULL as boxFrontFilename,
  NULL as titlescreenFilename,
  NULL as videoSnapFilename,
  g.SidFilename as sidFilename,
  g.CRC as crc,
  y.Year as year,
  CASE WHEN g.V_PalNTSC = 'P' OR g.V_PalNTSC = 'B' THEN 1 ELSE 0 END as isPal,
  CASE WHEN g.V_PalNTSC = 'N' OR g.V_PalNTSC = 'B' THEN 1 ELSE 0 END as isNtsc,
  CASE WHEN g.V_TrueDriveEmu = '1' THEN 1 ELSE 0 END as trueDriveEmu,
  CASE WHEN g.Classic = 'True' THEN 1 ELSE 0 END as isClassic,
  ifnull(pg.ParentGenre, 'Unknown') as parentGenre,
  ifnull(ge.Genre, 'Unknown') as subGenre,
  de.Developer as developer_name,
  pu.Publisher as publisher_name,
  mu.Musician as musician_name,
  la.Language as languages
FROM Games g
LEFT JOIN Years y ON g.YE_Id = y.YE_Id
LEFT JOIN Genres ge ON g.GE_Id = ge.GE_Id
LEFT JOIN PGenres pg ON ge.PG_Id = pg.PG_Id
LEFT JOIN Developers de ON g.DE_Id = de.DE_Id
LEFT JOIN Publishers pu ON g.PU_Id = pu.PU_Id
LEFT JOIN Musicians mu ON g.MU_Id = mu.MU_Id
LEFT JOIN Languages la ON g.LA_Id = la.LA_Id;
`);

rebuildSearchIndex();
optimizeDatabase();
verifySupportObjects();

db.close();
console.log(`Success! Database updated at ${dbPath}`);
