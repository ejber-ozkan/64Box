const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvFile = path.join(__dirname, '../gb64_export/Games.csv');
const fileContent = fs.readFileSync(csvFile, 'utf8');
const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true
});

console.log(`CSV Record Count: ${records.length}`);
console.log(`First record ID: ${records[0].GA_Id}`);
console.log(`Last record ID: ${records[records.length-1].GA_Id}`);
