// 微博热搜数据解析与过滤（基于 weibo.com/ajax/side/hotSearch 结构）

// 推广/广告条目识别：hotgovs 是官方置顶推广；realtime 中 label/category 为"荐"/"商"等也视为推广
// 实测 realtime 中商业推广通过 is_promoted/label 判断；hotgovs 单独数组，默认剔除（用户要求剔除广告推广）
// 但官方置顶时政条目（hotgovs）按用户指令"包含置顶"，故保留 hotgovs 的第一条置顶并标记 pinned

/**
 * 解析 weibo.com/ajax/side/hotSearch 响应
 * @returns {Array<{title, hot, label, category, wordScheme, pinned, url}>}
 */
function parseHotSearchCards(data) {
  const result = [];
  if (!data || !data.data) return result;

  // 1. 官方置顶（hotgovs）：保留为置顶条目
  const hotgovs = data.data.hotgovs;
  if (Array.isArray(hotgovs)) {
    for (const g of hotgovs) {
      const title = (g.word || g.name || '').replace(/^#|#$/g, '').trim();
      if (!title) continue;
      result.push({
        title,
        hot: '',
        label: g.icon_desc || '置顶',
        category: '',
        wordScheme: g.word || '',
        pinned: true,
        url: ''
      });
    }
  }

  // 2. 实时热搜（realtime）：剔除商业推广，保留真实热搜
  const realtime = data.data.realtime;
  if (Array.isArray(realtime)) {
    for (const item of realtime) {
      const title = (item.word || item.note || '').trim();
      if (!title) continue;
      // 商业推广判断：is_promoted 字段或 label 为"荐"/"商"
      if (item.is_promoted === 1 || item.label_name === '荐' || item.label_name === '商') continue;
      result.push({
        title,
        hot: item.num != null ? String(item.num) : '',
        label: item.label_name || item.icon_desc || '',
        category: item.category || '',
        wordScheme: item.word_scheme || item.word || '',
        pinned: false,
        url: ''
      });
    }
  }

  return result;
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
 * 从 m.weibo.cn 搜索结果 JSON 中提取第一条微博正文
 * card_type=9 的卡片为 mblog 卡片
 */
function extractFirstWeiboText(data) {
  const cards = data && data.data && data.data.cards;
  if (!Array.isArray(cards)) return '';

  for (const card of cards) {
    if (card.card_type === 9 && card.mblog && card.mblog.text) {
      return stripHtml(card.mblog.text);
    }
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
  stripHtml
};
