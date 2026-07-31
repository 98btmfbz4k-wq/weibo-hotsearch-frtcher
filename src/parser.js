// 微博热搜数据解析与过滤

// 推广/广告条目通常使用以下 icon 标识（基于实测数据）
const PROMOTION_ICON_KEYS = ['imgtool', 'recom', 'zongbang', 'ad_', 'tuiguang', 'huodong'];

// 判断是否为商业推广/广告条目
function isPromotion(card) {
  const icon = card.icon || '';
  return PROMOTION_ICON_KEYS.some(k => icon.includes(k));
}

// 判断是否为官方置顶条目（icon flags/2_0）
function isPinned(card) {
  const icon = card.icon || '';
  return icon.includes('flags/2_0');
}

// 去除 HTML 标签，还原纯文本
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u200b/g, '')
    .trim();
}

/**
 * 从热搜列表 JSON 解析条目（已剔除广告/推广）
 * @returns {Array<{title, hot, icon, scheme, pinned}>}
 */
function parseHotSearchCards(data) {
  const cards = data && data.data && data.data.cards;
  if (!Array.isArray(cards)) return [];

  // 主榜数据位于 cards[0].card_group
  const group = cards[0] && cards[0].card_group;
  const list = Array.isArray(group) ? group : [];

  const result = [];
  for (const card of list) {
    if (!card.desc) continue;
    if (isPromotion(card)) continue; // 剔除广告/推广
    result.push({
      title: card.desc,
      hot: card.desc_extr || '',
      icon: card.icon || '',
      scheme: card.scheme || '',
      pinned: isPinned(card)
    });
  }
  return result;
}

/**
 * 从搜索结果 JSON 中提取第一条微博正文
 * 搜索结果中 card_type=9 的卡片为 mblog 卡片
 */
function extractFirstWeiboText(data) {
  const cards = data && data.data && data.data.cards;
  if (!Array.isArray(cards)) return '';

  for (const card of cards) {
    if (card.card_type === 9 && card.mblog && card.mblog.text) {
      return stripHtml(card.mblog.text);
    }
    // 部分结果嵌套在 card_group 中
    if (Array.isArray(card.card_group)) {
      for (const sub of card.card_group) {
        if (sub.card_type === 9 && sub.mblog && sub.mblog.text) {
          return stripHtml(sub.mblog.text);
        }
      }
    }
  }
  return '';
}

module.exports = {
  parseHotSearchCards,
  extractFirstWeiboText,
  stripHtml,
  isPromotion,
  isPinned
};
