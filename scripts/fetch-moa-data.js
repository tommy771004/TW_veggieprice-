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
function getPastDateStrings(days) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Taipei time approximate
    const iso = new Date(d.getTime() + 8 * 3600 * 1000).toISOString().split('T')[0];
    dates.push(iso);
  }
  return dates;
}

async function main() {
  const dates = getPastDateStrings(7); // Fetch last 7 days
  let allRecords = [];
  
  console.log('🚀 Starting daily fetch of MOA data using Loop Search...');
  
  for (const isoDate of dates) {
    const rocDate = formatROCDate(isoDate);
    console.log(`\n📅 Fetching data for date: ${isoDate} (ROC: ${rocDate})`);
    
    let skip = 0;
    while (true) {
      const url = `https://data.moa.gov.tw/api/v1/AgriProductsTransType/?Start_time=${rocDate}&End_time=${rocDate}&$top=1000&$skip=${skip}`;
      console.log(`   ➔ Fetching skip=${skip}...`);
      
      try {
        const data = await fetchWithRetry(url);
        
        if (data && data.Data && data.Data.length > 0) {
          allRecords.push(...data.Data);
          console.log(`      Found ${data.Data.length} records.`);
        }
        
        if (!data || !data.Next) {
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
  
  const publicDataDir = path.join(__dirname, '..', 'public', 'data');
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
  
  const filePath = path.join(publicDataDir, 'latest-opendata.json');
  fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');
  console.log(`\n🎉 Successfully saved ${allRecords.length} total records to ${filePath}`);
}

main().catch(err => {
  console.error("Critical Error in fetch script:", err);
  process.exit(1);
});
