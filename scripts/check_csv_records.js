const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const outputDir = path.join(__dirname, '../gb64_export');
const tables = [
    'Artists', 'Config', 'Crackers', 'Developers', 'Difficulty',
    'Extras', 'Games', 'Genres', 'Languages', 'Licenses',
    'Music', 'Musicians', 'PGenres', 'Programmers', 'Publishers',
    'Rarities', 'ViewData', 'ViewFilters', 'Years'
];

console.log('Table | CSV Records');
console.log('--- | ---');

for (const tableName of tables) {
    const csvFile = path.join(outputDir, `${tableName}.csv`);
    if (!fs.existsSync(csvFile)) continue;
    
    const fileContent = fs.readFileSync(csvFile, 'utf8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
    });
    console.log(`${tableName} | ${records.length}`);
}
