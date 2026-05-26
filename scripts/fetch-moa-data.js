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

  // 1. Determine dates to fetch
  const today = new Date(new Date().getTime() + 8 * 3600 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  
  let existingFiles = [];
  if (fs.existsSync(dailyDataDir)) {
    existingFiles = fs.readdirSync(dailyDataDir).filter(f => f.endsWith('.json'));
  }

  const existingFileNames = new Set(existingFiles.map(f => f.replace('.json', '')));
  const datesToSync = [];

  for (let i = 0; i <= 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    
    // Check if it's recent (last 3 days should always be checked for late updates)
    // or if it's missing entirely
    if (i <= 3 || !existingFileNames.has(iso)) {
       datesToSync.push(iso);
    }
  }
  
  // Sort oldest to newest
  datesToSync.reverse();

  console.log(`📋 總計有 ${datesToSync.length} 天的資料待確認與更新。`);

  let fetchedAny = false;
  let revalidateCrops = new Set();
  
  // N04: 蔬菜, N05: 水果
  const categories = ['N04', 'N05'];

  for (const isoDate of datesToSync) {
    const dailyPath = path.join(dailyDataDir, `${isoDate}.json`);
    
    // 如果當前已有這個日期的檔案，我們只需要「最近一兩天」進行重新抓取(以防晚到的資料)
    const isRecent = todayStr === isoDate || 
      new Date(today.getTime() - 24*3600*1000).toISOString().split('T')[0] === isoDate;
      
    // 若不是最近的日期，且檔案已存在，就跳過
    if (fs.existsSync(dailyPath) && !isRecent && existingFiles.length > 0) {
      if (datesToSync.length < 10) {
        console.log(`⏭️  跳過已存在且無需更新的日期: ${isoDate}`);
      }
      continue;
    }

    const rocDate = formatROCDate(isoDate);
    console.log(`\n📅 [${isoDate}] 開始擷取 (民國: ${rocDate})`);
    
    let dailyRecords = [];

    const url = `https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?StartDate=${rocDate}&EndDate=${rocDate}`;
    console.log(`   ➔ 取得農產品交易資料: ${url}`);
    
    try {
      const startTime = Date.now();
      const data = await fetchWithRetry(url);
      const duration = Date.now() - startTime;
      
      if (Array.isArray(data) && data.length > 0) {
        // Filter N04 (Vegetable) and N05 (Fruit)
        const relevantData = data.filter(item => item['種類代碼'] === 'N04' || item['種類代碼'] === 'N05');
        
        // Map Chinese keys to English keys to maintain compatibility with existing system
        dailyRecords = relevantData.map(item => ({
          TransDate: item['交易日期'],
          TcType: item['種類代碼'],
          CropCode: item['作物代號'],
          CropName: item['作物名稱'],
          MarketCode: item['市場代號'],
          MarketName: item['市場名稱'],
          Upper_Price: item['上價'],
          Middle_Price: item['中價'],
          Lower_Price: item['下價'],
          Avg_Price: item['平均價'],
          Trans_Quantity: item['交易量']
        }));
        
        console.log(`   ✅ 取得 ${dailyRecords.length} 筆資料 (過濾前: ${data.length} 筆) (${duration}ms)`);
      } else {
        console.log(`   ⚠️ 沒有資料 (${duration}ms)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Interval 0.3s
    } catch (err) {
      console.error(`\n      ❌ 擷取資料失敗:`, err.message);
    }
    
    console.log(`   ✅ [${isoDate}] 完成處理. 總計: ${dailyRecords.length} 筆`);
    
    if (dailyRecords.length > 0) {
      const tempDailyPath = dailyPath + '.tmp';
      fs.writeFileSync(tempDailyPath, JSON.stringify(dailyRecords), 'utf-8');
      fs.renameSync(tempDailyPath, dailyPath);
      fetchedAny = true;
      dailyRecords.forEach(r => {
        if (r.CropName) revalidateCrops.add(r.CropName);
      });
    } else if (isRecent) {
       console.log(`   ⚠️ [${isoDate}] 未收到任何資料，可能今日尚未開始交易。`);
    } else {
       // 如果不是最近一天也沒有資料，可能是休市或者舊天數，我們保存空陣列避免之後一直重複查詢
       console.log(`   ⚠️ [${isoDate}] 無資料(可能是休市日)，寫入空陣列以防重複查詢。`);
       const tempDailyPath = dailyPath + '.tmp';
       fs.writeFileSync(tempDailyPath, JSON.stringify([]), 'utf-8');
       fs.renameSync(tempDailyPath, dailyPath);
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
  const tempFilePath = filePath + '.tmp';
  const payload = {
    metadata: {
      lastUpdated: new Date().toISOString(),
      recordCount: latestRecords.length
    },
    data: latestRecords
  };
  fs.writeFileSync(tempFilePath, JSON.stringify(payload), 'utf-8');
  fs.renameSync(tempFilePath, filePath);
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
