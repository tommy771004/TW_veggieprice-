const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('next/document')) {
        console.log('FOUND IN:', fullPath);
      }
      if (content.includes('should not be imported outside of pages/_document')) {
        console.log('ERROR THROWER IN:', fullPath);
      }
    }
  }
}

searchDir('.next');
