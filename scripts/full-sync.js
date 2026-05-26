const fs = require('fs');
const path = require('path');

const repo = 'tommy771004/TW_veggieprice-';

async function main() {
  console.log(`Fetching full recursive tree for ${repo}...`);
  const treeUrl = `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`;
  
  try {
    const res = await fetch(treeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch tree: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.tree || data.tree.length === 0) {
      console.log('Empty tree or error fetching tree.');
      return;
    }

    const blobFiles = data.tree.filter(item => item.type === 'blob');
    console.log(`Found ${blobFiles.length} files in repository.`);

    // Let's filter files we want to skip or include
    // We shouldn't overwrite system config files like .env or system skills if any,
    // but standard files (src, public, package.json, tsconfig.json, next.config.ts, tailwind.config.ts etc.) we certainly should.
    const ignoredPaths = [
      'package-lock.json',
      '.env',
      '.env.local'
    ];

    let updatedCount = 0;

    for (const item of blobFiles) {
      const filename = item.path;
      
      // Skip ignored paths or .git etc.
      if (ignoredPaths.some(ignored => filename.includes(ignored)) || filename.startsWith('.git') || filename.startsWith('skills/')) {
        continue;
      }

      const filePath = path.resolve(process.cwd(), filename);
      
      // We will read local content and compare
      let localContent = null;
      if (fs.existsSync(filePath)) {
        localContent = fs.readFileSync(filePath, 'utf8');
      }

      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${filename}`;
      
      // Fetch remote content
      const rawRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!rawRes.ok) {
        console.warn(`Warning: Failed to download raw file ${filename}: ${rawRes.status}`);
        continue;
      }

      const remoteContent = await rawRes.text();

      if (localContent !== remoteContent) {
        console.log(`[Updating] ${filename} is different, overwriting...`);
        // Ensure nesting directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, remoteContent, 'utf8');
        updatedCount++;
      }
    }

    console.log(`\nFull sync finished. Synced ${updatedCount} changed files.`);
  } catch (error) {
    console.error('Error during full sync:', error);
    process.exit(1);
  }
}

main();
