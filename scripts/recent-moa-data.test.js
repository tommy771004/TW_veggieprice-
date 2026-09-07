const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readRecentMoaData } = require('./recent-moa-data');

test('snapshot retains existing trading days when only the last four days refresh', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moa-recent-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (let day = 1; day <= 8; day++) {
    const record = { date: `2026-09-0${day}`, Avg_Price: day <= 3 ? 30 : 0 };
    fs.writeFileSync(path.join(dir, `${record.date}.json`), JSON.stringify([record]));
  }
  const records = readRecentMoaData(dir, '2026-09-07');
  assert.equal(records.length, 7);
  assert.equal(records.filter(r => r.Avg_Price > 0).length, 3);
  assert.equal(records[0].date, '2026-09-01');
  assert.equal(records.at(-1).date, '2026-09-07');
});

test('calendar window crosses leap day and refuses corrupt existing files', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moa-recent-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, '2024-02-29.json'), '[{"Avg_Price":20}]');
  fs.writeFileSync(path.join(dir, '2024-02-23.json'), '[{"Avg_Price":99}]');
  assert.deepEqual(readRecentMoaData(dir, '2024-03-01'), [{ Avg_Price: 20 }]);
  fs.writeFileSync(path.join(dir, '2024-03-01.json'), '{}');
  assert.throws(() => readRecentMoaData(dir, '2024-03-01'), /Invalid daily records/);
});
