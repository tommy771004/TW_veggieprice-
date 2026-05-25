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

// Convert ISO string to format expected
function getDatesToFetch(latestExistingIsoDate) {
  const today = new Date(new Date().getTime() + 8 * 3600 * 1000);
  const todayIso = today.toISOString().split('T')[0];

  let fetchStartDate = new Date(today.getTime());

  if (latestExistingIsoDate) {
    fetchStartDate = new Date(latestExistingIsoDate);
    fetchStartDate.setDate(fetchStartDate.getDate() + 1);
  } else {
    // defaults to last 90 days if no existing data
    fetchStartDate.setDate(fetchStartDate.getDate() - 90);
  }

  const dates = [];
  let current = new Date(fetchStartDate);
  while (current <= today) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function parseRocDate(rocDateStr) {
  const [y, m, d] = rocDateStr.split('.');
  return `${parseInt(y) + 1911}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function main() {
  const publicDataDir = path.join(__dirname, '..', 'public', 'data');
  const filePath = path.join(publicDataDir, 'latest-opendata.json');

  let existingData = [];
  let latestExistingIsoDate = null;

  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      existingData = parsed.data || [];

      for (const record of existingData) {
        if (record.TransDate) {
          const isoDate = parseRocDate(record.TransDate);
          if (!latestExistingIsoDate || isoDate > latestExistingIsoDate) {
            latestExistingIsoDate = isoDate;
          }
        }
      }
      console.log(`Found existing data with ${existingData.length} records. Latest date: ${latestExistingIsoDate}`);
    } catch (e) {
      console.warn('Failed to parse existing JSON, starting fresh.', e);
    }
  }

  const dates = getDatesToFetch(latestExistingIsoDate);
  
  if (dates.length === 0 || (dates.length === 1 && dates[0] < latestExistingIsoDate)) {
    console.log('✅ Data is already up-to-date.');
    return;
  }

  let allRecords = [...existingData];
  
  console.log(`🚀 Starting fetch of MOA data for ${dates.length} days using Loop Search...`);
  
  for (const isoDate of dates) {
    const rocDate = formatROCDate(isoDate);
    console.log(`\n📅 Fetching data for date: ${isoDate} (ROC: ${rocDate})`);
    
    let skip = 0;
    let pageCount = 0;
    const maxPages = 50; // Safety net for infinite loop (50 * 1000 = 50,000 records per day max)
    while (pageCount < maxPages) {
      pageCount++;
      const url = `https://data.moa.gov.tw/api/v1/AgriProductsTransType/?Start_time=${rocDate}&End_time=${rocDate}&$top=1000&$skip=${skip}`;
      console.log(`   ➔ Fetching skip=${skip}...`);
      
      try {
        const data = await fetchWithRetry(url);
        
        if (data && data.Data && data.Data.length > 0) {
          allRecords.push(...data.Data);
          console.log(`      Found ${data.Data.length} records.`);
        }
        
        if (!data || !data.Next || !data.Data || data.Data.length === 0) {
          console.log(`   ✅ Finished for date ${isoDate}.`);
          break; // No more pages
        }
        
        skip += 1000;
        // rate limit protection
        await new Promise(resolve => setTimeout(resolve, 500)); 
      } catch (err) {
        console.error(`   ❌ Failed to fetch data for ${isoDate} skip=${skip}:`, err.message);
        break;
      }
    }
  }

  // Remove records older than ~95 days to prevent infinite growth
  const cutoffDate = new Date(new Date().getTime() + 8 * 3600 * 1000);
  cutoffDate.setDate(cutoffDate.getDate() - 95);
  const cutoffIso = cutoffDate.toISOString().split('T')[0];

  allRecords = allRecords.filter(record => {
    if (!record.TransDate) return true;
    return parseRocDate(record.TransDate) >= cutoffIso;
  });

  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  
  const payload = {
    metadata: {
      lastUpdated: new Date().toISOString(),
      recordCount: allRecords.length
    },
    data: allRecords
  };
  
  fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');
  console.log(`\n🎉 Successfully saved ${allRecords.length} total records to ${filePath}`);

  // Revalidate tags on the live app
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const uniqueCrops = [...new Set(allRecords.map(r => r.CropName).filter(Boolean))];
  console.log(`\n🔄 Triggering cache revalidation for ${uniqueCrops.length} crops at ${appUrl}...`);
  let revalidated = 0;
  for (const crop of uniqueCrops) {
    try {
      // Pass the Date header to trigger our custom Tag-based revalidation in the Route Handler
      await fetch(`${appUrl}/api/prices/history?crop=${encodeURIComponent(crop)}`, {
        method: 'GET',
        headers: { 'Date': new Date().toUTCString() }
      });
      revalidated++;
    } catch (e) {
      console.warn(`⚠️ Failed to revalidate ${crop}`, e.message);
    }
  }
  console.log(`✅ Cache revalidation complete (${revalidated}/${uniqueCrops.length} successful)`);
}

main().catch(err => {
  console.error("Critical Error in fetch script:", err);
  process.exit(1);
});
