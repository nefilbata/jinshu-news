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
    url: 'https://www.ctwx.tsinghua.edu.cn/kxyj/zxky.htm',
    type: 'web',
    selector: {
      list: 'ul.tr-list li',
      title: 'div.tr-list-tt a',
      link: 'div.tr-list-tt a',
      date: 'div.tr-list-date',
    },
    category: '学术机构',
    priority: 'high',
  },
  {
    id: 'fudan-dgwz',
    name: '复旦大学出土文献与古文字研究中心',
    shortName: '复旦出土文献',
    url: 'https://www.fdgwz.org.cn/',
    type: 'web',
    selector: {
      list: 'div#new_artice table tbody tr',
      title: 'td a',
      link: 'td a',
      date: 'td[align="right"]',
    },
    category: '学术机构',
    priority: 'high',
  },
  {
    id: 'wuhan-bsm',
    name: '武汉大学简帛研究中心',
    shortName: '武大简帛',
    url: 'http://www.bsm.org.cn/',
    type: 'web',
    selector: {
      list: 'div#bsm_article ul.article_ul li',
      title: 'a[href*="hanjian"]',
      link: 'a[href*="hanjian"]',
      date: 'li.date',
    },
    category: '学术机构',
    priority: 'high',
  },
  {
    id: 'anhui-hzzx',
    name: '安徽大学汉字发展与应用研究中心',
    shortName: '安大汉字中心',
    url: 'https://hz.ahu.edu.cn/6036/list.htm',
    type: 'web',
    selector: {
      list: 'ul.vp_article_list li.list_item',
      title: 'span.Article_Title',
      link: 'a',
      date: 'div.fields.ex_fields',
    },
    category: '学术机构',
    priority: 'medium',
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

  // ── CNKI 期刊 RSS ─────────────────────────────────────────

  // 核心期刊（高优先级）
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
    id: 'cnki-qtqj',
    name: '《青铜器与金文》',
    shortName: '青铜器与金文',
    url: 'https://rss.cnki.net/knavi/rss/QTQJ?pcode=CJFD,CCJD',
    type: 'rss',
    category: '出土文献',
    priority: 'high',
  },
  {
    id: 'cnki-jgys',
    name: '《甲骨文与殷商史》',
    shortName: '甲骨文与殷商史',
    url: 'https://rss.cnki.net/knavi/rss/JGYS?pcode=CJFD,CCJD',
    type: 'rss',
    category: '出土文献',
    priority: 'high',
  },
  {
    id: 'cnki-gyjw',
    name: '《古文字研究》',
    shortName: '古文字研究',
    url: 'https://rss.cnki.net/knavi/rss/GYJW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '出土文献',
    priority: 'high',
  },
  {
    id: 'cnki-jbjb',
    name: '《简帛》',
    shortName: '简帛',
    url: 'https://rss.cnki.net/knavi/rss/JBJB?pcode=CJFD,CCJD',
    type: 'rss',
    category: '出土文献',
    priority: 'high',
  },
  {
    id: 'cnki-ydxk',
    name: '《殷都学刊》',
    shortName: '殷都学刊',
    url: 'https://rss.cnki.net/knavi/rss/YDXK?pcode=CJFD,CCJD',
    type: 'rss',
    category: '出土文献',
    priority: 'high',
  },

  // 地方考古期刊（中优先级）
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
  {
    id: 'cnki-zlbk',
    name: '《中国国家博物馆馆刊》',
    shortName: '国家博物馆刊',
    url: 'https://rss.cnki.net/knavi/rss/ZLBK?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-lfww',
    name: '《南方文物》',
    shortName: '南方文物',
    url: 'https://rss.cnki.net/knavi/rss/LFWW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-scww',
    name: '《四川文物》',
    shortName: '四川文物',
    url: 'https://rss.cnki.net/knavi/rss/SCWW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-webo',
    name: '《文博》',
    shortName: '文博',
    url: 'https://rss.cnki.net/knavi/rss/WEBO?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-bjww',
    name: '《北方文物》',
    shortName: '北方文物',
    url: 'https://rss.cnki.net/knavi/rss/BJWW?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-wwcq',
    name: '《文物春秋》',
    shortName: '文物春秋',
    url: 'https://rss.cnki.net/knavi/rss/WWCQ?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-nmwc',
    name: '《草原文物》',
    shortName: '草原文物',
    url: 'https://rss.cnki.net/knavi/rss/NMWC?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-wwjk',
    name: '《文物季刊》',
    shortName: '文物季刊',
    url: 'https://rss.cnki.net/knavi/rss/WWJK?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },
  {
    id: 'cnki-kgxj',
    name: '《考古学集刊》',
    shortName: '考古学集刊',
    url: 'https://rss.cnki.net/knavi/rss/KGXJ?pcode=CJFD,CCJD',
    type: 'rss',
    category: '考古文物',
    priority: 'medium',
  },

  // ── A: Google Scholar RSS（关键词订阅）────────────────────
  // 说明：访问 https://scholar.google.com/scholar?q=关键词
  //       右下角"创建快讯"→ RSS 链接；境外IP可直接抓
  {
    id: 'scholar-jinwen',
    name: 'Google Scholar · 金文铭文',
    shortName: 'Scholar',
    url: 'https://scholar.google.com/scholar_alerts?update_op=create_alert_options&hl=zh-CN&alert_query=%E9%87%91%E6%96%87+%E9%93%AD%E6%96%87&alert_freq=1&as_sdt=1%2C5&as_vis=1&num=10&output=rss',
    type: 'rss',
    category: '学术动态',
    priority: 'medium',

  },
  {
    id: 'scholar-qingtongqi',
    name: 'Google Scholar · 青铜器',
    shortName: 'Scholar',
    url: 'https://scholar.google.com/scholar_alerts?update_op=create_alert_options&hl=zh-CN&alert_query=%E9%9D%92%E9%93%9C%E5%99%A8+%E9%93%AD%E6%96%87&alert_freq=1&as_sdt=1%2C5&as_vis=1&num=10&output=rss',
    type: 'rss',
    category: '学术动态',
    priority: 'medium',

  },
  {
    id: 'scholar-guwenzi',
    name: 'Google Scholar · 古文字出土文献',
    shortName: 'Scholar',
    url: 'https://scholar.google.com/scholar_alerts?update_op=create_alert_options&hl=zh-CN&alert_query=%E5%8F%A4%E6%96%87%E5%AD%97+%E5%87%BA%E5%9C%9F%E6%96%87%E7%8C%AE&alert_freq=1&as_sdt=1%2C5&as_vis=1&num=10&output=rss',
    type: 'rss',
    category: '学术动态',
    priority: 'medium',

  },

  // ── B: 微信公众号（via RSSHub 公共实例）──────────────────
  // biz 值从公众号文章 URL 的 __biz= 参数获取
  // 公共实例限速，建议自建 RSSHub：https://docs.rsshub.app/deploy/
  // 备用实例：rss.shab.fun / rsshub.rssforever.com
  {
    id: 'wx-fudan-ctwx',
    name: '复旦出土文献（公众号）',
    shortName: '复旦出土文献号',
    url: 'https://rsshub.app/wechat/mp/article/MzI5NTM2NzYxNA==',
    type: 'rss',
    category: '出土文献',
    priority: 'medium',

    fallbackUrls: [
      'https://rss.shab.fun/wechat/mp/article/MzI5NTM2NzYxNA==',
      'https://rsshub.rssforever.com/wechat/mp/article/MzI5NTM2NzYxNA==',
    ],
  },
  {
    id: 'wx-xianqin',
    name: '先秦史研究室（公众号）',
    shortName: '先秦史号',
    url: 'https://rsshub.app/wechat/mp/article/MzA3NjM3NDgwMA==',
    type: 'rss',
    category: '学术机构',
    priority: 'medium',

    fallbackUrls: [
      'https://rss.shab.fun/wechat/mp/article/MzA3NjM3NDgwMA==',
    ],
  },
  {
    id: 'wx-guobo',
    name: '中国国家博物馆（公众号）',
    shortName: '国博号',
    url: 'https://rsshub.app/wechat/mp/article/MzI1NTYxNTgxNg==',
    type: 'rss',
    category: '考古文物',
    priority: 'low',

    fallbackUrls: [
      'https://rss.shab.fun/wechat/mp/article/MzI1NTYxNTgxNg==',
    ],
  },

  // ── C: CNKI 关键词搜索（本地跑，境内IP）──────────────────
  // type: 'cnki-search'，由 fetch.js 里 fetchCnkiSearch() 处理
  // 搜索范围：CNKI 全库，按发表时间倒序，取最新20条
  {
    id: 'cnki-search-jinwen',
    name: 'CNKI · 金文关键词',
    shortName: 'CNKI搜索',
    type: 'cnki-search',
    query: '金文 铭文 青铜器铭',
    category: '出土文献',
    priority: 'medium',

  },
  {
    id: 'cnki-search-ctwx',
    name: 'CNKI · 出土文献关键词',
    shortName: 'CNKI搜索',
    type: 'cnki-search',
    query: '出土文献 简帛 甲骨文 古文字',
    category: '出土文献',
    priority: 'medium',

  },
  {
    id: 'cnki-search-kaogu',
    name: 'CNKI · 青铜器考古',
    shortName: 'CNKI搜索',
    type: 'cnki-search',
    query: '青铜器 西周 商代 考古发掘 出土',
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
