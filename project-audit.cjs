// project-audit.cjs - spustíš v StackBlitz terminálu: node project-audit.cjs
const fs = require('fs');
const path = require('path');

const srcDir = './src';
const report = {
  emptyFiles: [],
  largeFiles: [],
  duplicateImports: {},
  unusedExports: [],
  componentCategories: {
    tuyaCards: [],
    dashboardWidgets: [],
    modals: [],
    services: [],
    hooks: [],
    css: []
  }
};

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const filePath = path.join(dir, f);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath, stat);
    }
  });
}

// Analýza souborů
walkDir(srcDir, (filePath, stat) => {
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);
  const sizeKB = (stat.size / 1024).toFixed(1);

  // Prázdné soubory
  if (stat.size === 0) {
    report.emptyFiles.push(filePath);
  }

  // Velké soubory (>15KB)
  if (stat.size > 15000) {
    report.largeFiles.push({ path: filePath, size: sizeKB + ' KB' });
  }

  // Kategorizace
  if (ext === '.css') {
    report.componentCategories.css.push({ name: fileName, size: sizeKB + ' KB' });
  }
  if (fileName.includes('Card.tsx')) {
    report.componentCategories.tuyaCards.push(fileName);
  }
  if (fileName.includes('Widget.tsx')) {
    report.componentCategories.dashboardWidgets.push(fileName);
  }
  if (fileName.includes('Modal.tsx')) {
    report.componentCategories.modals.push(fileName);
  }
  if (fileName.includes('Service.ts') || fileName.includes('service.ts')) {
    report.componentCategories.services.push(fileName);
  }
  if (fileName.startsWith('use') && ext === '.ts') {
    report.componentCategories.hooks.push(fileName);
  }
});

// Výstup
console.log('\n📊 PROJECT AUDIT REPORT\n');
console.log('========================\n');

console.log('🚨 PRÁZDNÉ SOUBORY:', report.emptyFiles.length);
report.emptyFiles.forEach(f => console.log('  - ' + f));

console.log('\n📦 VELKÉ SOUBORY (>15KB):', report.largeFiles.length);
report.largeFiles
  .sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
  .forEach(f => console.log(`  - ${f.size.padStart(8)} : ${f.path}`));

console.log('\n🎴 TUYA KARTY:', report.componentCategories.tuyaCards.length);
report.componentCategories.tuyaCards.forEach(f => console.log('  - ' + f));

console.log('\n📊 DASHBOARD WIDGETY:', report.componentCategories.dashboardWidgets.length);
report.componentCategories.dashboardWidgets.forEach(f => console.log('  - ' + f));

console.log('\n🎨 CSS SOUBORY:', report.componentCategories.css.length);
report.componentCategories.css
  .sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
  .slice(0, 10)
  .forEach(f => console.log(`  - ${f.size.padStart(8)} : ${f.name}`));

console.log('\n🔧 SERVICES:', report.componentCategories.services.length);
report.componentCategories.services.forEach(f => console.log('  - ' + f));

console.log('\n🪝 HOOKS:', report.componentCategories.hooks.length);
report.componentCategories.hooks.forEach(f => console.log('  - ' + f));

// Uložení do souboru
fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2));
console.log('\n✅ Report uložen do audit-report.json');