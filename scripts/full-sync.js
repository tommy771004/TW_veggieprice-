const fs = require('fs');
const path = require('path');

const repo = 'tommy771004/TW_veggieprice-';

async function main() {
  const force = process.argv.includes('--force');
  console.log(`Fetching full recursive tree for ${repo}... (Force: ${force})`);
  
  // Use a timestamp to prevent caching at the HTTP proxy/CDN level
  const treeUrl = `https://api.github.com/repos/${repo}/git/trees/main?recursive=1&t=${Date.now()}`;
  
  try {
    const res = await fetch(treeUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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

    // Sensitive files to NOT overwrite
    const ignoredPaths = [
      '.env',
      '.env.local'
    ];

    const concurrencyLimit = 35;
    let updatedCount = 0;
    
    const downloadQueue = [...blobFiles];
    
    async function worker() {
      while (downloadQueue.length > 0) {
        const item = downloadQueue.shift();
        if (!item) continue;
        
        const filename = item.path;
        
        // Skip ignored paths or .git etc.
        if (ignoredPaths.some(ignored => filename === ignored || filename.endsWith('/' + ignored)) || filename.startsWith('.git') || filename.startsWith('skills/')) {
          continue;
        }

        const filePath = path.resolve(process.cwd(), filename);
        
        // Read local content if existed
        let localContent = null;
        if (fs.existsSync(filePath)) {
          localContent = fs.readFileSync(filePath, 'utf8');
        }

        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${filename}?t=${Date.now()}`;
        
        try {
          const rawRes = await fetch(rawUrl, {
            cache: 'no-store',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (!rawRes.ok) {
            console.warn(`Warning: Failed to download raw file ${filename}: ${rawRes.status}`);
            continue;
          }

          const remoteContent = await rawRes.text();

          const normLocal = localContent ? localContent.replace(/\r\n/g, '\n').trim() : null;
          const normRemote = remoteContent.replace(/\r\n/g, '\n').trim();

          if (force || normLocal !== normRemote) {
            console.log(`[Updating] ${filename} is different, overwriting...`);
            
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, remoteContent, 'utf8');
            updatedCount++;
          }
        } catch (err) {
          console.error(`Error downloading ${filename}:`, err);
        }
      }
    }

    // Run parallel workers
    const workers = Array.from({ length: concurrencyLimit }, () => worker());
    await Promise.all(workers);

    console.log(`\nFull sync finished. Synced ${updatedCount} changed files.`);
  } catch (error) {
    console.error('Error during full sync:', error);
    process.exit(1);
  }
}

main();
