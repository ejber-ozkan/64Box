const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../gb64.sqlite');
const db = new Database(dbPath);

const tables = [
    'Artists', 'Config', 'Crackers', 'Developers', 'Difficulty',
    'Extras', 'Games', 'Genres', 'Languages', 'Licenses',
    'Music', 'Musicians', 'PGenres', 'Programmers', 'Publishers',
    'Rarities', 'ViewData', 'ViewFilters', 'Years'
];

console.log('Table | SQLite Count');
console.log('--- | ---');
for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
    console.log(`${table} | ${row.count}`);
}

db.close();
