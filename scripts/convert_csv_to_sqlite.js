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

const performanceIndexes = [
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_ga_id ON Games(GA_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_name_nocase ON Games(Name COLLATE NOCASE)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_ye_id ON Games(YE_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_ge_id ON Games(GE_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_de_id ON Games(DE_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_pu_id ON Games(PU_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_mu_id ON Games(MU_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_la_id ON Games(LA_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_pr_id ON Games(PR_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_ar_id ON Games(AR_Id)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_classic ON Games(Classic)'],
    ['Games', 'CREATE INDEX IF NOT EXISTS idx_games_adult ON Games(Adult)'],
    ['Years', 'CREATE INDEX IF NOT EXISTS idx_years_ye_id ON Years(YE_Id)'],
    ['Genres', 'CREATE INDEX IF NOT EXISTS idx_genres_ge_id ON Genres(GE_Id)'],
    ['Genres', 'CREATE INDEX IF NOT EXISTS idx_genres_pg_id ON Genres(PG_Id)'],
    ['PGenres', 'CREATE INDEX IF NOT EXISTS idx_pgenres_pg_id ON PGenres(PG_Id)'],
    ['Developers', 'CREATE INDEX IF NOT EXISTS idx_developers_de_id ON Developers(DE_Id)'],
    ['Publishers', 'CREATE INDEX IF NOT EXISTS idx_publishers_pu_id ON Publishers(PU_Id)'],
    ['Musicians', 'CREATE INDEX IF NOT EXISTS idx_musicians_mu_id ON Musicians(MU_Id)'],
    ['Languages', 'CREATE INDEX IF NOT EXISTS idx_languages_la_id ON Languages(LA_Id)'],
    ['Programmers', 'CREATE INDEX IF NOT EXISTS idx_programmers_pr_id ON Programmers(PR_Id)'],
    ['Artists', 'CREATE INDEX IF NOT EXISTS idx_artists_ar_id ON Artists(AR_Id)'],
    ['Extras', 'CREATE INDEX IF NOT EXISTS idx_extras_ga_id ON Extras(GA_Id)'],
    ['Extras', 'CREATE INDEX IF NOT EXISTS idx_extras_ga_id_display_order ON Extras(GA_Id, DisplayOrder)'],
];

function tableExists(tableName) {
    return Boolean(
        db.prepare(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
        ).get(tableName)
    );
}

function createPerformanceIndexes() {
    console.log('Creating performance indexes...');
    for (const [tableName, sql] of performanceIndexes) {
        if (tableExists(tableName)) {
            db.exec(sql);
        }
    }
}

function rebuildCoverIndex() {
    console.log('Creating cover lookup table...');
    db.exec('DROP TABLE IF EXISTS GameCoverIndex');
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
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_game_cover_index_ga_id ON GameCoverIndex(GA_Id)'
    );
}

function rebuildSearchIndex() {
    console.log('Creating full-text search index...');
    db.exec('DROP TABLE IF EXISTS GameSearchIndex');
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
    db.exec(`INSERT INTO GameSearchIndex(GameSearchIndex) VALUES('optimize')`);
}

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

createPerformanceIndexes();
if (tableExists('Extras')) {
    rebuildCoverIndex();
}

db.exec(`DROP VIEW IF EXISTS GameView`);
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

db.close();
console.log(`Success! Database updated at ${dbPath}`);

