const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const Database = require('better-sqlite3');

const outputDir = path.join(__dirname, '../gb64_export');
const dbPath = path.join(__dirname, '../gb64.sqlite');

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

const tables = [
    { name: 'Games', pk: 'GA_Id' },
    { name: 'Developers', pk: 'DE_Id' },
    { name: 'Publishers', pk: 'PU_Id' },
    { name: 'Musicians', pk: 'MU_Id' },
    { name: 'Genres', pk: 'GE_Id' },
    { name: 'Languages', pk: 'LA_Id' },
    { name: 'Years', pk: 'YE_Id' },
    { name: 'PGenres', pk: 'PG_Id' }
];

console.log('Converting CSVs to SQLite...');

for (const table of tables) {
    const csvFile = path.join(outputDir, `${table.name}.csv`);
    if (!fs.existsSync(csvFile)) {
        console.warn(`Skipping ${table.name}, CSV not found.`);
        continue;
    }
    console.log(`Importing ${table.name}...`);
    
    const fileContent = fs.readFileSync(csvFile, 'utf8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
    });

    if (records.length === 0) continue;

    // Create table using the columns from the first record
    const columns = Object.keys(records[0]);
    // GA_Id is often string in CSV but is primary key, we treat it as INTEGER in sqlite
    const colsDef = columns.map(c => `"${c}" TEXT`).join(', ');
    
    db.exec(`CREATE TABLE IF NOT EXISTS "${table.name}" (${colsDef})`);

    const insertSql = `INSERT INTO "${table.name}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    const stmt = db.prepare(insertSql);

    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            stmt.run(columns.map(c => row[c] || ''));
        }
    });

    insertMany(records);
}

// Create views and indexes for the frontend
console.log('Creating optimized views...');

db.exec(`
CREATE VIEW IF NOT EXISTS GameView AS
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
console.log(`Success! Database created at ${dbPath}`);
