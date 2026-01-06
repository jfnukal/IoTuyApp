const fs = require('fs');
const path = require('path');

// Složky a soubory, které chceme IGNOROVAT
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.vscode', 'coverage'];
const IGNORE_FILES = ['package-lock.json', 'yarn.lock', '.DS_Store', '.env', 'merge-project.js'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json'];

const outputFile = 'project_context.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (!IGNORE_FILES.includes(file) && ALLOWED_EXTENSIONS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(__dirname);
let outputContent = '';

allFiles.forEach(file => {
  // Přidáme hlavičku s názvem souboru pro lepší orientaci
  const relativePath = path.relative(__dirname, file);
  outputContent += `\n\n--- START FILE: ${relativePath} ---\n\n`;
  outputContent += fs.readFileSync(file, 'utf8');
  outputContent += `\n\n--- END FILE: ${relativePath} ---\n`;
});

fs.writeFileSync(outputFile, outputContent);
console.log(`✅ Hotovo! Všechny kódy jsou v souboru: ${outputFile}`);