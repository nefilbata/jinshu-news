/**
 * 金文资讯站 - 信源配置
 * type: 'rss' | 'web'
 * category: 用于前端分类标签
 */

export const SOURCES = [
  // ── 核心学术机构（网页抓取）──────────────────────────────
  {
    id: 'qinghua-ctwx',
    name: '清华大学出土文献研究与保护中心',
    shortName: '清华出土文献',
    url: 'https://www.ctwx.tsinghua.edu.cn/ctwx/qkml.htm',
    type: 'web',
    // 告诉爬虫怎么找文章列表
    selector: {
      list: 'ul.list li, .article-list li, table tr',  // 按实际页面调整
      title: 'a',
      link: 'a',
      date: 'span.date, td.date',
    },
    category: '学术机构',
    priority: 'high',
  },
  {
    id: 'fudan-dgwz',
    name: '复旦大学出土文献与古文字研究中心',
    shortName: '复旦出土文献',
    url: 'https://dgwz.fudan.edu.cn/',
    type: 'web',
    selector: {
      list: '.news-list li, .list-item, article',
      title: 'a, h3, h4',
      link: 'a',
      date: '.date, time',
    },
    category: '学术机构',
    priority: 'high',
  },
  {
    id: 'wuhan-bsm',
    name: '武汉大学简帛研究中心',
    shortName: '武大简帛',
    url: 'https://www.bsm.org.cn/',
    type: 'web',
    selector: {
      list: '.article-list li, .news li, ul li',
      title: 'a',
      link: 'a',
      date: '.time, .date, span',
    },
    category: '学术机构',
    priority: 'high',
  },
  {
    id: 'xianqin-blog',
    name: '先秦史研究室',
    shortName: '先秦史研究室',
    url: 'https://www.xianqin.org/blog/',
    type: 'web',
    selector: {
      list: 'article, .post',
      title: 'h2 a, h1 a, .entry-title a',
      link: 'h2 a, .entry-title a',
      date: '.entry-date, time, .post-date',
    },
    category: '学术机构',
    priority: 'medium',
  },

  // ── CNKI 期刊 RSS（已激活） ───────────────────────────────
  {
    id: 'cnki-wenw',
    name: '《文物》',
    shortName: '文物',
    url: 'https://rss.cnki.net/knavi/rss/WENW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'high',
  },
  {
    id: 'cnki-kagu',
    name: '《考古》',
    shortName: '考古',
    url: 'https://rss.cnki.net/knavi/rss/KAGU?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'high',
  },
  {
    id: 'cnki-kgxb',
    name: '《考古学报》',
    shortName: '考古学报',
    url: 'https://rss.cnki.net/knavi/rss/KGXB?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'high',
  },
  {
    id: 'cnki-ctwx',
    name: '《出土文献与古文字研究》',
    shortName: '出土文献',
    url: 'https://rss.cnki.net/knavi/rss/CTWX?pcode=CJFD,CCJD',
    type: 'rss',
    category: '出土文献',
    priority: 'high',
  },
  {
    id: 'cnki-jhkg',
    name: '《江汉考古》',
    shortName: '江汉考古',
    url: 'https://rss.cnki.net/knavi/rss/JHKG?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-zyww',
    name: '《中原文物》',
    shortName: '中原文物',
    url: 'https://rss.cnki.net/knavi/rss/ZYWW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-kgyw',
    name: '《考古与文物》',
    shortName: '考古与文物',
    url: 'https://rss.cnki.net/knavi/rss/KGYW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-hxkg',
    name: '《华夏考古》',
    shortName: '华夏考古',
    url: 'https://rss.cnki.net/knavi/rss/HXKG?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-ggbw',
    name: '《故宫博物院院刊》',
    shortName: '故宫院刊',
    url: 'https://rss.cnki.net/knavi/rss/GGBW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
];

// 金文相关关键词，用于 AI 过滤判断
export const JINSHU_KEYWORDS = [
  // 核心词
  '金文', '青铜器', '铭文', '钟鼎文', '彝铭', '器铭',
  // 器类
  '鼎', '簋', '尊', '卣', '壶', '盘', '爵', '觚', '觯', '钟', '镈', '铎',
  '戈', '剑', '矛', '斧', '戟',
  // 时代
  '商周', '西周', '东周', '春秋', '战国', '殷商',
  // 相关领域
  '出土文献', '简帛', '甲骨文', '古文字', '先秦史',
  '历谱', '月相', '武王克商', '天文历法',
  // 研究方法
  '断代', '考释', '著录', '集成', '图录',
  // 机构/人名相关
  '金文研究', '铭文考', '铭文释读',
];
