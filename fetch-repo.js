const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

async function downloadAndExtract() {
  console.log('Downloading repo zip...');
  execSync('npx -y node --eval "require(\'child_process\').execSync(\'curl -L https://github.com/tommy771004/TW_veggieprice-/archive/refs/heads/main.zip -o repo.zip\')"');
  
  console.log('Got zip, extracting...');
  // Extract using unzip or node script
  execSync('unzip -o -q repo.zip -d extracted');
  
  const root = process.cwd();
  const extractedPath = path.join(root, 'extracted', 'TW_veggieprice--main');
  
  console.log('Removing old files...');
  const keep = new Set([
     '.agents', '.claude', 'extracted', 'repo.zip', 'fetch-repo.js', 'node_modules', '.next', '.git'
  ]);
  
  const items = fs.readdirSync(root);
  for (const item of items) {
    if (keep.has(item)) continue;
    fs.rmSync(path.join(root, item), { recursive: true, force: true });
  }
  
  console.log('Copying new files...');
  const newItems = fs.readdirSync(extractedPath);
  for (const item of newItems) {
    fs.cpSync(path.join(extractedPath, item), path.join(root, item), { recursive: true });
  }
  
  console.log('Cleaning up...');
  fs.rmSync(path.join(root, 'extracted'), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'repo.zip'), { force: true });
  console.log('Done!');
}

downloadAndExtract();
