const axios = require('axios');
const logger = require('./logger');

// 移动端浏览器 UA，模拟真实访客
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

/**
 * 走 Sina Visitor System 流程获取 SUB / SUBP cookie
 * 流程：genvisitor2 → incarnate → 提取 sub/subp
 * 用于绕过 m.weibo.cn 对未登录访客的拦截
 */
async function getVisitorCookies() {
  const client = axios.create({
    baseURL: 'https://m.weibo.cn',
    headers: {
      'User-Agent': UA,
      'Referer': 'https://m.weibo.cn/',
      'Accept': 'application/json, text/plain, */*'
    },
    timeout: 15000
  });

  // 1. genvisitor2 获取 tid
  const params = new URLSearchParams();
  params.append('cb', 'visitor_gray_callback');
  params.append('ver', '20250916');
  params.append('from', 'weibo');
  params.append('webdriver', 'false');
  params.append('return_url', 'https://m.weibo.cn/');

  const res = await client.post('/visitor/genvisitor2', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  let tid = '';
  if (typeof res.data === 'string') {
    const m = res.data.match(/"tid"\s*:\s*"([^"]+)"/);
    tid = m ? m[1] : '';
  } else if (res.data && res.data.data) {
    tid = res.data.data.tid || '';
  }
  if (!tid) throw new Error('visitor 流程未获取到 tid');
  logger.info(`visitor: 获取 tid=${tid.slice(0, 8)}...`);

  // 2. incarnate 获取 SUB/SUBP
  const incRes = await client.get('/visitor/visitor', {
    params: {
      a: 'incarnate',
      t: tid,
      w: '2',
      c: '03',
      gc: '',
      cb: 'cross_domain',
      from: 'weibo',
      _rand: Math.random()
    }
  });

  const raw = typeof incRes.data === 'string' ? incRes.data : JSON.stringify(incRes.data);
  const mSub = raw.match(/"sub"\s*:\s*"([^"]+)"/);
  const mSubp = raw.match(/"subp"\s*:\s*"([^"]+)"/);
  const sub = mSub ? mSub[1] : '';
  const subp = mSubp ? mSubp[1] : '';

  if (!sub) throw new Error('visitor 流程未获取到 SUB cookie');
  logger.info('visitor: 已获取 SUB/SUBP cookie');
  return { SUB: sub, SUBP: subp };
}

module.exports = { getVisitorCookies, UA };
