const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function pad(n) { return String(n).padStart(2, '0'); }

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 按月分日志文件
function logFile() {
  const d = new Date();
  return path.join(LOG_DIR, `${d.getFullYear()}-${pad(d.getMonth() + 1)}.log`);
}

function write(level, msg) {
  const line = `[${timestamp()}] [${level}] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(logFile(), line); } catch (e) { /* 忽略日志写入失败 */ }
}

// 记录抓取失败事件为独立 JSON 文件，便于排查
function logFailure(time, err) {
  const dir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stem = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}_${pad(time.getHours())}${pad(time.getMinutes())}`;
  const file = path.join(dir, `failure_${stem}.json`);
  const body = {
    time: time.toISOString(),
    error: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack : ''
  };
  fs.writeFileSync(file, JSON.stringify(body, null, 2));
  return file;
}

module.exports = {
  info: (m) => write('INFO', m),
  warn: (m) => write('WARN', m),
  error: (m) => write('ERROR', m),
  logFailure
};
