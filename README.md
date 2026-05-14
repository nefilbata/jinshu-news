# 金文动态 · JinWen News

金文、出土文献及先秦史学术资讯聚合站。

## 项目结构

```
jinshu-news/
├── fetcher/          Node.js 数据抓取脚本
│   ├── sources.js    信源配置
│   ├── fetch.js      RSS + 网页抓取
│   ├── ai.js         Claude API 过滤与摘要
│   ├── upload.js     Supabase 写入
│   ├── export.js     导出为 web/data.json
│   └── index.js      主程序
├── web/
│   ├── index.html    前端页面（GitHub Pages 部署）
│   └── data.json     每日自动生成的数据文件
├── .github/workflows/
│   └── daily.yml     GitHub Actions 定时任务
└── supabase_schema.sql  数据库建表语句
```

---

## 部署步骤

### 第一步：Supabase 建表

1. 在 [Supabase](https://supabase.com) 新建项目
2. 进入 SQL Editor，执行 `supabase_schema.sql` 中的内容
3. 记录下：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **anon key**（前端用，只读）
   - **service_role key**（脚本写入用，保密！）

### 第二步：配置 GitHub Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret，添加：

| 名称 | 值 |
|------|-----|
| `ANTHROPIC_API_KEY` | 你的 Claude API Key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | service_role key |

### 第三步：本地测试

```bash
cd fetcher
npm install

# 设置环境变量（Windows PowerShell）
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_KEY="eyJ..."

# 运行一次抓取
node index.js

# 导出数据到前端
node export.js
```

### 第四步：GitHub Pages 部署

1. 推送代码到 GitHub
2. Settings → Pages → Source 选择 `main` 分支 `/web` 文件夹
3. 等待第一次 Actions 运行后，`web/data.json` 会自动生成

---

## 关于网页抓取（非RSS信源）

清华、复旦、武大、先秦史研究室四个网站需要网页抓取，
页面结构各不相同，首次运行时可能需要手动调整 `sources.js` 中各信源的 `selector` 配置。

调试方法：
```bash
# 在 Node.js 中测试某个信源
node -e "
import('./fetch.js').then(m => m.fetchAll()).then(items => {
  const filtered = items.filter(i => i.sourceId === 'fudan-dgwz');
  console.log(JSON.stringify(filtered.slice(0,3), null, 2));
});
"
```

---

## 定时任务

GitHub Actions 配置为每天 **北京时间早 8:00** 自动运行。
也可在 Actions 页面手动点击 "Run workflow" 立即触发。

---

## 扩展信源（已注释，随时可激活）

`sources.js` 中注释掉的 CNKI 期刊可按需在 `SOURCES` 数组中取消注释并添加：
- 《甲骨文与殷商史》《青铜器与金文》（最相关，优先激活）
- 《殷都学刊》《简帛》
- 各省文物期刊

---

## 本地开发（不连接数据库）

直接打开 `web/index.html`，若无 `data.json` 文件，
页面会自动加载内置的8条演示数据，可用于调试前端样式。
