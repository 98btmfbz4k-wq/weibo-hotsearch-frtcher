const logger = require('./logger');

/**
 * 带退避重试的执行器
 * @param {Function} fn 返回 Promise 的函数，接收 attempt 参数
 * @param {Object} opts
 * @param {number} opts.times 最大尝试次数（含首次）
 * @param {number} opts.delay 基础退避毫秒，每次递增
 * @param {string} opts.label 日志标签
 */
async function retry(fn, { times = 3, delay = 1500, label = '操作' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const msg = err && err.message ? err.message : String(err);
      logger.warn(`${label} 第 ${attempt}/${times} 次失败: ${msg}`);
      if (attempt < times) {
        await new Promise(r => setTimeout(r, delay * attempt));
      }
    }
  }
  throw lastErr;
}

module.exports = { retry };
