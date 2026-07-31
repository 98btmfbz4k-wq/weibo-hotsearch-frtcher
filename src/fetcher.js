const axios = require('axios');
const { extractFirstWeiboText } = require('./parser');
const logger = require('./logger');

// PC 端公开接口：无需 cookie，海外可用，返回 50 条热搜
const HOT_SEARCH_URL = 'https://weibo.com/ajax/side/hotSearch';

// 移动端 UA + Referer：触发 PC 接口返回 JSON 的关键
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

function buildHeaders() {
  return {
    'User-Agent': UA,
    'Referer': 'https://weibo.com/',
    'Accept': 'application/json, text/plain, */*'
  };
}

const parseResponse = [(d) => {
  try { return JSON.parse(d); } catch { return d; }
}];

/**
 * 抓取热搜列表 JSON（weibo.com PC 公开接口，无需 cookie）
 */
async function fetchHotSearchList() {
  const res = await axios.get(HOT_SEARCH_URL, {
    headers: buildHeaders(),
    timeout: 15000,
    transformResponse: parseResponse
  });
  if (res.data && res.data.ok === 1 && res.data.data) return res.data;
  throw new Error('热搜接口返回异常: ' + JSON.stringify(res.data).slice(0, 200));
}

/**
 * 抓取某关键词搜索结果中第一条微博的正文
 * 主用 m.weibo.cn 移动端搜索接口；失败返回空串
 * @returns {Promise<string>} 纯文本正文，无内容则返回空串
 */
async function fetchFirstWeiboText(keyword) {
  const q = encodeURIComponent(keyword);
  const url = `https://m.weibo.cn/api/container/getIndex?containerid=100103type%3D1%26q%3D${q}`;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://m.weibo.cn/',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 15000,
      transformResponse: parseResponse
    });
    if (res.data && res.data.ok === 1) return extractFirstWeiboText(res.data);
  } catch (e) {
    logger.warn(`搜索「${keyword}」失败: ${e.message}`);
  }
  return '';
}

module.exports = { fetchHotSearchList, fetchFirstWeiboText };
