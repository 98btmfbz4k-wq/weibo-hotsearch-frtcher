const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function pad(n) { return String(n).padStart(2, '0'); }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 按日期+时段生成文件名，如 2026-07-31_1200
function getFileStem(collectedAt) {
  const d = new Date(collectedAt);
  const slot = d.getHours() < 15 ? '1200' : '1800';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${slot}`;
}

// 保存 Markdown 与 JSON 两种格式
function saveResult(md, json, collectedAt) {
  ensureDir();
  const stem = getFileStem(collectedAt);
  const mdPath = path.join(DATA_DIR, `${stem}.md`);
  const jsonPath = path.join(DATA_DIR, `${stem}.json`);
  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
  return { mdPath, jsonPath };
}

module.exports = { saveResult, DATA_DIR };
