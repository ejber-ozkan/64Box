const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../');
const NODE_MODULES = path.join(ROOT, 'node_modules/@emulatorjs/');
const PUBLIC_EMU = path.join(ROOT, 'public/emulator/data');

const FOLDERS = [
  { src: 'emulatorjs/data', dest: '' },
  { src: 'core-vice_x64sc', dest: 'cores' },
  { src: 'core-vice_x64', dest: 'cores' }
];

console.log('--- Project 64Box Offline Local Setup ---');

if (!fs.existsSync(PUBLIC_EMU)) {
    fs.mkdirSync(PUBLIC_EMU, { recursive: true });
}

function copyFolderSync(from, to) {
    if (!fs.existsSync(from)) {
        console.warn(`Warning: Source folder ${from} not found.`);
        return;
    }
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(element => {
        const stat = fs.lstatSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
            console.log(`Copied: ${element}`);
        } else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

FOLDERS.forEach(f => {
    const srcPath = path.join(NODE_MODULES, f.src);
    const destPath = path.join(PUBLIC_EMU, f.dest);
    console.log(`Copying ${f.src} to ${f.dest || 'root'}...`);
    copyFolderSync(srcPath, destPath);
});

console.log('--- Offline Setup Complete ---');
