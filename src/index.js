const { fetchHotSearchList, fetchFirstWeiboText } = require('./fetcher');
const { parseHotSearchCards } = require('./parser');
const { toMarkdown, toJson } = require('./formatter');
const { saveResult } = require('./storage');
const { retry } = require('./retry');
const logger = require('./logger');

const TARGET_COUNT = 50;
const DETAIL_DELAY = 1200; // 每条热搜详情抓取间隔(ms)，避免触发风控

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const collectedAt = new Date();
  logger.info(`=== 微博热搜抓取开始 ${collectedAt.toISOString()} ===`);

  // 1. 抓取热搜列表（带重试，无需 cookie）
  let hotData;
  try {
    hotData = await retry(() => fetchHotSearchList(), { times: 3, delay: 2000, label: '热搜列表抓取' });
  } catch (err) {
    logger.error(`热搜列表抓取失败（已重试 3 次）: ${err.message}`);
    const file = logger.logFailure(collectedAt, err);
    logger.error(`失败信息已记录至 ${file}`);
    process.exit(1);
  }

  // 2. 解析并剔除广告/推广
  let items = parseHotSearchCards(hotData);
  logger.info(`解析到 ${items.length} 条热搜（已剔除广告/推广）`);

  // 3. 取前 50 条
  if (items.length < TARGET_COUNT) {
    logger.warn(`仅获取到 ${items.length} 条，不足目标 ${TARGET_COUNT} 条`);
  }
  items = items.slice(0, TARGET_COUNT);

  // 4. 逐条抓取首条微博正文（串行 + 间隔，降低风控风险）
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const text = await retry(
        () => fetchFirstWeiboText(item.title),
        { times: 2, delay: 1500, label: `第${i + 1}条「${item.title}」详情` }
      );
      item.firstWeibo = text || '（无微博内容）';
    } catch (e) {
      item.firstWeibo = '（获取失败）';
      logger.warn(`第 ${i + 1} 条「${item.title}」详情获取失败: ${e.message}`);
    }
    if (i < items.length - 1) await sleep(DETAIL_DELAY);
  }

  // 5. 质量校验
  const okCount = items.filter(it => it.firstWeibo && !it.firstWeibo.includes('获取失败')).length;
  logger.info(`首条微博正文获取成功 ${okCount}/${items.length} 条`);

  // 6. 格式化并存储
  const md = toMarkdown(items, collectedAt);
  const json = toJson(items, collectedAt);
  const paths = saveResult(md, json, collectedAt);
  logger.info(`已保存: ${paths.mdPath}`);
  logger.info(`已保存: ${paths.jsonPath}`);

  // 7. 结构变化预警
  if (items.length < 40) {
    logger.warn('⚠️ 热搜条目数明显偏少，微博页面结构可能已变更，请人工检查');
  }

  logger.info(`=== 抓取完成，共 ${items.length} 条 ===`);
}

main().catch(err => {
  logger.error('未捕获错误: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
