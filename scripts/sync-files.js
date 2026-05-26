const fs = require('fs');
const path = require('path');

async function main() {
  const commitSha = 'e3d3fa6a6d46f946e99836d04f4113c31afeb84c';
  const repo = 'tommy771004/TW_veggieprice-';
  const commitUrl = `https://api.github.com/repos/${repo}/commits/${commitSha}`;

  console.log(`Fetching commit details from ${commitUrl}...`);
  
  try {
    const res = await fetch(commitUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch commit: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.files || data.files.length === 0) {
      console.log('No files modified in this commit.');
      return;
    }

    console.log(`Found ${data.files.length} modified files in commit ${commitSha}:`);
    for (const file of data.files) {
      console.log(`- ${file.filename} (${file.status})`);
    }

    console.log('\nDownloading files and overwriting local workspace...');
    for (const file of data.files) {
      const filePath = path.resolve(process.cwd(), file.filename);
      
      if (file.status === 'removed') {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted locally: ${file.filename}`);
        }
        continue;
      }

      // Download raw content
      const rawUrl = `https://raw.githubusercontent.com/${repo}/${commitSha}/${file.filename}`;
      console.log(`Downloading ${file.filename} from ${rawUrl}...`);
      
      const rawRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!rawRes.ok) {
        throw new Error(`Failed to download ${file.filename}: ${rawRes.status} ${rawRes.statusText}`);
      }

      const content = await rawRes.text();
      
      // Ensure nesting directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully updated: ${file.filename}`);
    }

    console.log('\nSync finished successfully!');
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }
}

main();
