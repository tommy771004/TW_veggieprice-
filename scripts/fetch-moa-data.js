const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to fetch with retries using exponential backoff + full jitter.
// Jitter formula: random delay in [0, min(CAP, base * 2^attempt)] — avoids
// synchronized retry storms (Thundering Herd) when multiple jobs retry together.
async function fetchWithRetry(url, options = {}, retries = 3) {
  const BASE_DELAY_MS = 1000;   // 1 s
  const MAX_DELAY_MS  = 30000;  // 30 s ceiling

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds
      options.signal = controller.signal;
      options.headers = {
        ...options.headers,
        'Connection': 'close'
      };

      const res = await fetch(url, options);
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();

      // Guard against 503/maintenance HTML pages returned with a 200 status
      if (text.trimStart().startsWith('<')) {
        throw new Error(`Non-JSON response (HTML): ${text.substring(0, 120).replace(/\s+/g, ' ')}`);
      }

      return JSON.parse(text);
    } catch (err) {
      if (attempt === retries) throw err;

      // Full-jitter backoff: uniform random in [0, min(CAP, base * 2^attempt)]
      const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
      const delay = Math.floor(Math.random() * ceiling);
      console.warn(`[attempt ${attempt}/${retries}] ${url} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
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
  
  // -------------------------------------------------------------
  // Phase 2: Livestock & Poultry Data Fetching
  // -------------------------------------------------------------
  console.log('\n🐄 開始擷取 畜禽行情資料 (過去90天 / 漁產30天)...');
  const d90 = new Date(today);
  d90.setDate(d90.getDate() - 90);
  const startISO = d90.toISOString().split('T')[0];
  const endISO = todayStr;

  const startGregorian = startISO.replace(/-/g, '/');
  const endGregorian = endISO.replace(/-/g, '/');

  // Seafood ROC Date (keep range to 30 days to avoid huge payload)
  const d30 = new Date(today);
  d30.setDate(d30.getDate() - 30);
  const startISOSeafood = d30.toISOString().split('T')[0];
  const startROCSeafood = formatROCDate(startISOSeafood).replace(/\./g, '');
  const endROCSeafood = formatROCDate(endISO).replace(/\./g, '');

  const apiEndpoints = [
    { name: 'egg_chicken', url: `https://data.moa.gov.tw/api/v1/PoultryTransType_BoiledChicken_Eggs/?Start_time=${startGregorian}&End_time=${endGregorian}` },
    { name: 'red_feather', url: `https://data.moa.gov.tw/api/v1/PoultryTransType_RedFeather/?Start_time=${startGregorian}&End_time=${endGregorian}` },
    { name: 'goose_duck', url: `https://data.moa.gov.tw/api/v1/PoultryTransType_Goose_Duck_Duckegg/?Start_time=${startGregorian}&End_time=${endGregorian}` },
    { name: 'sheep', url: `https://data.moa.gov.tw/api/v1/SheepQuotation/?Start_time=${startGregorian}&End_time=${endGregorian}` },
    { name: 'pork', url: `BY_DAY` },
    { name: 'seafood', url: `https://data.moa.gov.tw/Service/OpenData/FromM/AquaticTransData.aspx?StartDate=${startROCSeafood}&EndDate=${endROCSeafood}` }
  ];

  let livestockData = {};
  let seafoodData = [];

  for (const ep of apiEndpoints) {
    if (ep.name === 'pork') {
      console.log(`   ➔ 擷取: pork (毛豬 V1 API 90天逐日擷取)...`);
      try {
        const porkDates = [];
        for (let i = 0; i < 90; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const yr = d.getFullYear() - 1911;
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          porkDates.push(`${yr}${mm}${dd}`);
        }

        const porkRecords = [];
        const BATCH_SIZE = 15;
        for (let i = 0; i < porkDates.length; i += BATCH_SIZE) {
          const batch = porkDates.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (date) => {
              try {
                const res = await fetchWithRetry(`https://data.moa.gov.tw/api/v1/PorkTransType/?TransDate=${date}`);
                return res?.Data || [];
              } catch (e) {
                console.warn(`      ⚠️ 擷取毛豬單日資料失敗 [${date}]: ${e.message}`);
                return [];
              }
            })
          );
          for (const list of batchResults) {
            if (Array.isArray(list)) {
              porkRecords.push(...list);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        livestockData[ep.name] = porkRecords;
        console.log(`   ✅ pork 擷取完成，共計 ${porkRecords.length} 筆資料 (涵蓋 ${new Set(porkRecords.map(r => r.TransDate)).size} 個交易日)`);
      } catch (err) {
        console.warn(`   ⚠️ pork 逐日擷取失敗:`, err.message);
        livestockData[ep.name] = [];
      }
      continue;
    }

    console.log(`   ➔ 擷取: ${ep.name}`);
    try {
      const data = await fetchWithRetry(ep.url);
      if (ep.name === 'seafood') {
        seafoodData = Array.isArray(data) ? data : (data.Data || []);
      } else {
        if (data && data.Data) {
          livestockData[ep.name] = data.Data;
        } else {
          livestockData[ep.name] = [];
        }
      }
    } catch (err) {
      console.warn(`   ⚠️ 失敗: ${ep.name}`, err.message);
      if (ep.name === 'seafood') seafoodData = [];
      else livestockData[ep.name] = [];
    }
  }

  const livestockPath = path.join(publicDataDir, 'latest-livestock.json');
  const tempLivestockPath = livestockPath + '.tmp';
  const livestockPayload = {
    metadata: {
      lastUpdated: new Date().toISOString(),
      startISO,
      endISO
    },
    data: livestockData
  };
  fs.writeFileSync(tempLivestockPath, JSON.stringify(livestockPayload), 'utf-8');
  fs.renameSync(tempLivestockPath, livestockPath);
  console.log(`🎉 Successfully saved livestock records to ${livestockPath}`);

  const seafoodPath = path.join(publicDataDir, 'latest-seafood.json');
  const tempSeafoodPath = seafoodPath + '.tmp';
  const seafoodPayload = {
    metadata: {
      lastUpdated: new Date().toISOString(),
      startISO: startISOSeafood,
      endISO
    },
    data: seafoodData
  };
  fs.writeFileSync(tempSeafoodPath, JSON.stringify(seafoodPayload), 'utf-8');
  fs.renameSync(tempSeafoodPath, seafoodPath);
  console.log(`🎉 Successfully saved seafood records to ${seafoodPath}`);

  // -------------------------------------------------------------
  // Phase 3: Market Rest Days
  // -------------------------------------------------------------
  console.log('\n📅 開始擷取 批發市場休市日資料...');
  try {
    const endpoints = [
      { name: '果菜及花卉', url: 'https://data.moa.gov.tw/api/v1/MarketRestDayFarmWCF/' },
      { name: '漁市', url: 'https://data.moa.gov.tw/api/v1/MarketRestDayFishWCF/' }
    ];

    const allRestDays = [];

    for (const ep of endpoints) {
      console.log(`   ➔ 擷取: ${ep.url}`);
      try {
        const data = await fetchWithRetry(ep.url);
        if (!data || !data.Data) continue;

        for (const market of data.Data) {
          const marketName = market.MarkerName || market.MarketName || '';
          if (!market.MarketTypeList) continue;

          for (const typeList of market.MarketTypeList) {
            if (!typeList.YearList) continue;
            for (const yList of typeList.YearList) {
              const rYear = typeof yList.Year === 'number' ? yList.Year : parseInt(yList.Year);
              // limit to recent years just in case
              if (rYear < 112) continue; 
              const gregorianYear = rYear + 1911;

              if (!yList.MonthList) continue;
              for (const mList of yList.MonthList) {
                const month = String(mList.Month).padStart(2, '0');
                if (!mList.Rest) continue;
                
                const days = mList.Rest.split('、');
                for (const d of days) {
                  const dayStr = d.trim();
                  if (!dayStr) continue;
                  
                  // some days might have spaces or weird characters, try to parse
                  const dayNum = parseInt(dayStr, 10);
                  if (isNaN(dayNum)) continue;

                  const dateStr = `${gregorianYear}-${month}-${String(dayNum).padStart(2, '0')}`;
                  
                  allRestDays.push({
                    marketName,
                    date: dateStr,
                    note: ep.name
                  });
                }
              }
            }
          }
        }
      } catch (err) {
         console.warn(`   ⚠️ ${ep.name}休市日擷取失敗:`, err.message);
      }
    }

    // Deduplicate combining same market + date
    const uniqueMap = new Map();
    for (const d of allRestDays) {
      const key = `${d.marketName}_${d.date}`;
      // In case Note has both "果菜及花卉" and "漁市", we can join them (unlikely for the same market, but possible)
      if (uniqueMap.has(key)) {
         const existing = uniqueMap.get(key);
         if (!existing.note.includes(d.note)) {
            existing.note += ` / ${d.note}`;
         }
      } else {
         uniqueMap.set(key, { ...d });
      }
    }

    const normalizedRestDays = Array.from(uniqueMap.values());
    
    const restDaysPath = path.join(publicDataDir, 'market-rest-days.json');
    const tempRestDaysPath = restDaysPath + '.tmp';
    fs.writeFileSync(tempRestDaysPath, JSON.stringify(normalizedRestDays), 'utf-8');
    fs.renameSync(tempRestDaysPath, restDaysPath);
    console.log(`🎉 Successfully saved ${normalizedRestDays.length} market rest day records to ${restDaysPath}`);
  } catch (err) {
    console.warn(`   ⚠️ 批發市場休市日大發生未預期錯誤:`, err.message);
  }

  if (fetchedAny) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      console.log('ℹ️  APP_URL 未設定，跳過 Cache Revalidation（在 GitHub Secrets 中設定 APP_URL 可啟用）。');
    } else {
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
    }
  } else {
    console.log(`✅ Data is already up-to-date. No new fetches needed.`);
  }
}

main().catch(err => {
  console.error("Critical Error in fetch script:", err);
  process.exit(1);
});
