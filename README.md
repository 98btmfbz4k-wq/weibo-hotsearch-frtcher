# weibo-hotsearch-frtcher

微博热搜定时抓取器。每天 **12:00** 与 **18:00**（北京时间）自动抓取微博热搜前 **50** 条（剔除广告/推广），并抓取每个热搜词条对应搜索结果中的**第一条微博正文**，输出为 Markdown + JSON 双格式。

## 功能特性

- 抓取微博移动端热搜榜，按页面展示顺序保留排名
- 自动剔除商业推广/广告条目（依据 icon 标识识别）
- 对每个热搜词条调用搜索接口，提取首条微博纯文本正文
- 内置 Sina Visitor System 流程，被拦截时自动获取 visitor cookie
- 失败重试（最多 3 次），失败事件独立记录
- 质量校验：条目数不足 40 时触发结构变更预警
- GitHub Actions 云端定时运行，结果自动 commit 回仓库

## 项目结构

```
weibo-hotsearch-frtcher/
├── src/
│   ├── index.js        # 主流程编排
│   ├── fetcher.js      # 热搜列表 + 首条微博抓取
│   ├── visitor.js      # Sina Visitor System cookie 流程
│   ├── parser.js       # JSON 解析、推广过滤、HTML 去标签
│   ├── formatter.js    # Markdown / JSON 格式化
│   ├── storage.js      # 文件存储（按日期+时段命名）
│   ├── retry.js        # 退避重试工具
│   └── logger.js       # 日志与失败记录
├── .github/workflows/
│   └── fetch.yml       # GitHub Actions 定时任务
├── data/               # 抓取结果输出目录
├── logs/               # 运行日志目录
├── package.json
└── README.md
```

## 使用方法

### 本地手动运行

```bash
npm install
npm start
```

结果输出至 `data/` 目录，文件名形如 `2026-07-31_1200.md` 与 `2026-07-31_1200.json`。

### GitHub Actions 定时运行

1. 将本项目推送到 GitHub 仓库
2. 工作流 `.github/workflows/fetch.yml` 已配置每天 04:00 / 10:00 UTC（即北京 12:00 / 18:00）自动触发
3. 也可在仓库 **Actions** 页面手动触发 `workflow_dispatch`
4. 每次运行后，`data/` 与 `logs/` 会自动 commit 回仓库

## 输出示例

Markdown 文件：

```
# 微博热搜抓取 - 2026年07月31日 12:00

> 抓取时间：2026-07-31 12:00:00
> 共抓取 50 条（已剔除广告/推广）

| 序号 | 热搜标题 | 热度 | 首条微博内容 |
|------|----------|------|--------------|
| 1 | xxx | 3234312 | ... |
...
```

JSON 文件结构：

```json
{
  "collectionDate": "2026-07-31",
  "collectionTime": "12:00",
  "collectedAt": "2026-07-31T04:00:00.000Z",
  "count": 50,
  "items": [
    { "rank": 1, "title": "...", "hot": "3234312", "pinned": false, "firstWeibo": "..." }
  ]
}
```

## 错误处理

- 热搜列表抓取失败：重试 3 次后仍失败则记录 `logs/failure_*.json` 并退出
- 单条详情抓取失败：标记为「获取失败」，不阻断整体流程
- 条目数明显偏少（< 40）：日志输出结构变更预警

## 依赖

- Node.js >= 18
- axios
