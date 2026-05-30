# 金文速递

面向金文、青铜器铭文、出土文献与先秦史相关研究的每日资讯自动化项目。

当前版本以邮件日报为主，静态网页归档为辅：

1. GitHub Actions 每天北京时间 8:00 自动运行。
2. 抓取 RSS 与重点机构页面。
3. 先用规则初筛，再用 AI 精筛、分类、摘要和简短解读。
4. 通过 SMTP 发送 HTML 邮件。
5. 把历史条目和日报写入 `data/` 与 `docs/`，用于 GitHub Pages 归档。

## 目录

```text
fetcher/                 Node.js 自动化程序
data/articles.json        长期去重条目库
data/digests/YYYY-MM-DD.json
docs/index.html           静态归档页
docs/data.json            归档页数据
.github/workflows/daily.yml
```

## GitHub Secrets

必须配置：

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_TO
MAIL_FROM
AI_API_KEY
```

可选配置：

```text
AI_API_BASE   默认 https://api.deepseek.com/chat/completions
AI_MODEL      默认 deepseek-chat
SMTP_SECURE   465 端口默认 true；其他端口默认 STARTTLS
```

如果没有 `AI_API_KEY`，程序会退回规则筛选。如果没有 SMTP 配置，程序会生成归档但跳过发信。

## 本地运行

```powershell
cd "D:\Desktop\make progress\jinshu-news\fetcher"
npm install
npm run dry
```

dry run 会生成：

```text
docs/preview-email.html
docs/preview-email.txt
```

正式运行：

```powershell
npm run daily
```

只更新归档、不发邮件：

```powershell
npm run no-email
```
