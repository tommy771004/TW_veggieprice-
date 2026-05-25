const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to fetch with retries
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds
      options.signal = controller.signal;
      
      const res = await fetch(url, options);
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Attempt ${attempt} failed for ${url}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Format Date to ROC string (e.g. 113.05.01)
function formatROCDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(y) - 1911}.${m}.${d}`;
}

async function main() {
  const publicDataDir = path.join(__dirname, '..', 'public', 'data');
  const dailyDataDir = path.join(publicDataDir, 'daily');

  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  if (!fs.existsSync(dailyDataDir)) {
    fs.mkdirSync(dailyDataDir, { recursive: true });
  }

  // 1. Determine dates to fetch (last 95 days)
  const today = new Date(new Date().getTime() + 8 * 3600 * 1000);
  const datesToSync = [];
  
  for (let i = 0; i <= 95; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    datesToSync.push(d.toISOString().split('T')[0]);
  }
  
  // Sort oldest to newest
  datesToSync.reverse();

  let fetchedAny = false;
  let revalidateCrops = new Set();
  
  // N04: 蔬菜, N05: 水果, N06: 花卉
  const categories = ['N04', 'N05', 'N06'];

  for (const isoDate of datesToSync) {
    const dailyPath = path.join(dailyDataDir, `${isoDate}.json`);
    
    // Check if we already have data for this date
    // Note: Re-fetch if it's the current or previous day to handle late arriving data
    const isRecent = today.toISOString().split('T')[0] === isoDate || 
      new Date(today.getTime() - 24*3600*1000).toISOString().split('T')[0] === isoDate;
      
    if (fs.existsSync(dailyPath) && !isRecent) {
      continue;
    }

    const rocDate = formatROCDate(isoDate);
    console.log(`\n📅 Fetching data for date: ${isoDate} (ROC: ${rocDate})`);
    
    let dailyRecords = [];

    // Fetch sequentially by categories
    for (const category of categories) {
      console.log(`   ➔ Fetching Category: ${category}`);
      let skip = 0;
      let pageCount = 0;
      const maxPages = 30; // Safety net for infinite loop (30 * 1000 = 30,000 records per category per day max)

      while (pageCount < maxPages) {
        pageCount++;
        const url = `https://data.moa.gov.tw/api/v1/AgriProductsTransType/?Start_time=${rocDate}&End_time=${rocDate}&TcType=${category}&$top=1000&$skip=${skip}`;
        process.stdout.write(`      ➔ skip=${skip}... `);
        
        try {
          const data = await fetchWithRetry(url);
          
          if (data && data.Data && data.Data.length > 0) {
            dailyRecords.push(...data.Data);
            process.stdout.write(`Found ${data.Data.length} records.\n`);
          } else {
             process.stdout.write(`No records.\n`);
          }
          
          if (!data || !data.Data || data.Data.length < 1000) {
            break; // No more pages or last page
          }
          
          skip += 1000;
          await new Promise(resolve => setTimeout(resolve, 500)); 
        } catch (err) {
          console.error(`\n      ❌ Failed to fetch data:`, err.message);
          break;
        }
      }
    }
    
    console.log(`   ✅ Finished for date ${isoDate}. Total: ${dailyRecords.length}`);
    
    if (dailyRecords.length > 0) {
      fs.writeFileSync(dailyPath, JSON.stringify(dailyRecords), 'utf-8');
      fetchedAny = true;
      dailyRecords.forEach(r => {
        if (r.CropName) revalidateCrops.add(r.CropName);
      });
    }
  }

  // Combine the last 7 days into `latest-opendata.json` for backwards compatibility with front-end
  console.log('\n⏳ Combining latest 7 days for latest-opendata.json...');
  const latest7Dates = datesToSync.slice(-7);
  let latestRecords = [];
  
  for (const isoDate of latest7Dates) {
    const dailyPath = path.join(dailyDataDir, `${isoDate}.json`);
    if (fs.existsSync(dailyPath)) {
      try {
        const records = JSON.parse(fs.readFileSync(dailyPath, 'utf-8'));
        latestRecords.push(...records);
      } catch (err) {
        console.warn(`Could not read ${isoDate}.json`, err.message);
      }
    }
  }
  
  const filePath = path.join(publicDataDir, 'latest-opendata.json');
  const payload = {
    metadata: {
      lastUpdated: new Date().toISOString(),
      recordCount: latestRecords.length
    },
    data: latestRecords
  };
  fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');
  console.log(`🎉 Successfully saved ${latestRecords.length} recent records to ${filePath}`);
  
  if (fetchedAny) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const cropsToRevalidate = Array.from(revalidateCrops);
    console.log(`\n🔄 Triggering cache revalidation for ${cropsToRevalidate.length} crops at ${appUrl}...`);
    let revalidated = 0;
    // Cap to 20 crops max for revalidation to avoid overwhelming the live app
    const top20Crops = cropsToRevalidate.slice(0, 20);
    for (const crop of top20Crops) {
      try {
        await fetch(`${appUrl}/api/prices/history?crop=${encodeURIComponent(crop)}`, {
          method: 'GET',
          headers: { 'Date': new Date().toUTCString() }
        });
        revalidated++;
      } catch (e) {
        console.warn(`⚠️ Failed to revalidate ${crop}`, e.message);
      }
    }
    console.log(`✅ Cache revalidation complete (${revalidated}/${top20Crops.length} successful)`);
  } else {
    console.log(`✅ Data is already up-to-date. No new fetches needed.`);
  }
}

main().catch(err => {
  console.error("Critical Error in fetch script:", err);
  process.exit(1);
});
