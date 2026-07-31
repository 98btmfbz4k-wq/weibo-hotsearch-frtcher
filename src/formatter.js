function pad(n) { return String(n).padStart(2, '0'); }

function formatTimestamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 根据小时判断时段标签（12 点档 / 18 点档）
function getSlot(d) {
  return d.getHours() < 15 ? '12:00' : '18:00';
}

// 生成 Markdown 报告
function toMarkdown(items, collectedAt) {
  const d = new Date(collectedAt);
  const dateStr = `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`;
  const slot = getSlot(d);

  let md = `# 微博热搜抓取 - ${dateStr} ${slot}\n\n`;
  md += `> 抓取时间：${formatTimestamp(d)}\n`;
  md += `> 共抓取 ${items.length} 条（已剔除广告/推广）\n\n`;

  // 简表
  md += `| 序号 | 热搜标题 | 热度 | 首条微博内容 |\n`;
  md += `|------|----------|------|--------------|\n`;
  items.forEach((item, i) => {
    const title = String(item.title).replace(/\|/g, '\\|');
    const hot = item.hot || '-';
    const weibo = String(item.firstWeibo || '（获取失败）').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 200);
    md += `| ${i + 1} | ${title} | ${hot} | ${weibo} |\n`;
  });

  // 详情
  md += `\n---\n\n## 首条微博内容详情\n\n`;
  items.forEach((item, i) => {
    md += `### ${i + 1}. ${item.title}\n\n`;
    md += `- 热度：${item.hot || '-'}\n`;
    md += `- 首条微博：\n\n`;
    md += `${item.firstWeibo || '（获取失败）'}\n\n`;
  });

  return md;
}

// 生成 JSON 结构
function toJson(items, collectedAt) {
  const d = new Date(collectedAt);
  return {
    collectionDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    collectionTime: getSlot(d),
    collectedAt: d.toISOString(),
    count: items.length,
    items: items.map((item, i) => ({
      rank: i + 1,
      title: item.title,
      hot: item.hot || '',
      pinned: !!item.pinned,
      firstWeibo: item.firstWeibo || ''
    }))
  };
}

module.exports = { toMarkdown, toJson, getSlot };
