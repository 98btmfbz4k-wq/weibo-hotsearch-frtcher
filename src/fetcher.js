const axios = require('axios');
const { getVisitorCookies, UA } = require('./visitor');
const { extractFirstWeiboText } = require('./parser');
const logger = require('./logger');

const HOT_SEARCH_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

// 构造请求头，可选附带 visitor cookie
function buildHeaders(cookies) {
  const h = {
    'User-Agent': UA,
    'Referer': 'https://m.weibo.cn/',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'MWeibo-Pwa': '1'
  };
  if (cookies && cookies.SUB) {
    h.Cookie = `SUB=${cookies.SUB}; SUBP=${cookies.SUBP || ''}`;
  }
  return h;
}

// 自定义响应解析：JSON 优先，失败保留原始字符串（用于检测 visitor 拦截页）
const parseResponse = [(d) => {
  try { return JSON.parse(d); } catch { return d; }
}];

// 判断响应是否需要走 visitor 流程：
// 1) HTML 拦截页（Sina Visitor System）
// 2) JSON 返回 ok:-100（重定向到登录/passport）
function isVisitorBlock(data) {
  if (typeof data === 'string') {
    return data.includes('Sina Visitor') || data.includes('visitor_gray');
  }
  if (data && typeof data === 'object') {
    if (data.ok === -100) return true;
    // 部分拦截返回 ok:0 且带 passport 重定向 url
    if (data.ok === 0 && data.url && String(data.url).includes('passport.weibo.com')) return true;
  }
  return false;
}

/**
 * 抓取热搜列表 JSON
 * 策略：主动获取 visitor cookie 后再请求（云服务器 IP 段必然被风控）
 * 若仍被拦截则刷新 cookie 重试一次
 */
async function fetchHotSearchList(prefetchedCookies) {
  let cookies = prefetchedCookies;
  if (!cookies) {
    logger.info('未传入 visitor cookie，主动获取...');
    cookies = await getVisitorCookies();
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await axios.get(HOT_SEARCH_URL, {
      headers: buildHeaders(cookies),
      timeout: 15000,
      transformResponse: parseResponse
    });

    if (isVisitorBlock(res.data)) {
      logger.warn(`热搜接口仍被拦截（ok=-100/visitor），刷新 cookie 重试（第 ${attempt + 1} 次）...`);
      cookies = await getVisitorCookies();
      continue;
    }
    if (res.data && res.data.ok === 1) return res.data;
    throw new Error('热搜接口返回异常: ' + JSON.stringify(res.data).slice(0, 200));
  }
  throw new Error('热搜接口刷新 cookie 后仍被拦截');
}

/**
 * 抓取某关键词搜索结果中第一条微博的正文
 * @returns {Promise<string>} 纯文本正文，无内容则返回空串
 */
async function fetchFirstWeiboText(keyword, cookies) {
  const q = encodeURIComponent(keyword);
  const url = `https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D1%26q%3D${q}`;
  const res = await axios.get(url, {
    headers: buildHeaders(cookies),
    timeout: 15000,
    transformResponse: parseResponse
  });
  if (isVisitorBlock(res.data)) return '';
  if (res.data && res.data.ok === 1) return extractFirstWeiboText(res.data);
  return '';
}

module.exports = { fetchHotSearchList, fetchFirstWeiboText, getVisitorCookies };
