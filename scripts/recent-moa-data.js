const fs = require('node:fs');
const path = require('node:path');

/** Read seven calendar days, independently of which files needed refreshing. */
function readRecentMoaData(dailyDataDir, endISO) {
  const records = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(`${endISO}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    const dailyPath = path.join(dailyDataDir, `${iso}.json`);
    if (!fs.existsSync(dailyPath)) continue;
    // Do not publish a silently incomplete snapshot when an existing file is corrupt.
    const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
    if (!Array.isArray(daily)) throw new Error(`Invalid daily records: ${iso}`);
    records.push(...daily);
  }
  return records;
}

module.exports = { readRecentMoaData };
