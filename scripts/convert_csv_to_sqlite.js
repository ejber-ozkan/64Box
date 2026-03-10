const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const Database = require('better-sqlite3');

const outputDir = path.join(__dirname, '../gb64_export');
const dbPath = path.join(__dirname, '../gb64.sqlite');

// [MODIFIED] Do NOT delete the database file to preserve settings/other tables
// if (fs.existsSync(dbPath)) {
//     fs.unlinkSync(dbPath);
// }

console.log(`Connecting to database at ${dbPath}...`);
const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// [MODIFIED] Dynamically get all CSV files from the export directory
const csvFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.csv'));
console.log(`Found ${csvFiles.length} CSV files to import.`);

for (const file of csvFiles) {
    const tableName = path.basename(file, '.csv');
    const csvFile = path.join(outputDir, file);
    
    console.log(`Importing ${tableName}...`);
    
    const fileContent = fs.readFileSync(csvFile, 'utf8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
    });

    if (records.length === 0) {
        console.warn(`Skipping ${tableName}, no records found.`);
        continue;
    }

    // [MODIFIED] Drop existing table before recreating it
    db.exec(`DROP TABLE IF EXISTS "${tableName}"`);

    // Create table using the columns from the first record
    const columns = Object.keys(records[0]);
    // Map columns to TEXT for simplicity as per original design
    const colsDef = columns.map(c => `"${c}" TEXT`).join(', ');
    
    db.exec(`CREATE TABLE "${tableName}" (${colsDef})`);

    const insertSql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    const stmt = db.prepare(insertSql);

    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            stmt.run(columns.map(c => row[c] || ''));
        }
    });

    try {
        insertMany(records);
        console.log(`Successfully imported ${records.length} records into ${tableName}.`);
    } catch (err) {
        console.error(`Error importing ${tableName}:`, err.message);
    }
}

// Create views and indexes for the frontend
console.log('Creating optimized views...');

db.exec(`DROP VIEW IF EXISTS GameView`);
db.exec(`
CREATE VIEW GameView AS
SELECT 
    g.GA_Id as id,
    g.Name as name,
    g.Filename as filename,
    g.Filename as gameFilename,
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
    CASE WHEN g.Classic = '1' THEN 1 ELSE 0 END as isClassic,
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

db.close();
console.log(`Success! Database updated at ${dbPath}`);

