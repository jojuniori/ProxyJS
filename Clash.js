/***
 * - 魔改参考脚本来源： https://gist.github.com/dahaha-365/0b8beb613f8d1ee656fe1f21e1a07959
 * 
 * - 追加了对自定义规则集的支持
 * - 追加了对TG的自动测速分组
 * - 将分组分别分为了普通非测速固定和自动测速分开来
 *
 * [注] 不添加故障转移 (fallback) 分组的原因：
 * - fallback 按列表顺序使用第一个存活节点，仅在当前节点完全不通时才切换
 * - url-test (自动测速) 周期性测速并切到最快节点，tolerance: 50 已避免频繁跳切
 * - 两者核心区别：fallback 不关心延迟只关心存活，url-test 兼顾延迟和存活
 * - 当前 url-test + tolerance: 50 已覆盖 fallback 的主要价值
 * - 加 fallback 会使策略组数量翻倍，UI 复杂度暴增，实际收益极小
 * 
 * If use node：
 * - node convert.js source.yaml source_openclash.yaml Clash.js ; node convertLite.js source_openclash.yaml
 */

/**
 * 整个脚本的总开关，在Mihomo Party使用的话，请保持为true
 * true = 启用
 * false = 禁用
 */
const enable = true;

// 自定义覆写的规则
const customRules = [
  // ============================================
  // 国内直连
  // ============================================
  "IP-CIDR,10.0.0.0/8,直连",
  "IP-CIDR,172.16.0.0/12,直连",
  "IP-CIDR,192.168.0.0/16,直连",
  "IP-CIDR,127.0.0.0/8,直连",
  "IP-CIDR,224.0.0.0/4,直连",
  "IP-CIDR,240.0.0.0/4,直连",
  "PROCESS-NAME,VirtualDesktop.Streamer.exe,直连",
  "PROCESS-NAME,ToDesk.exe,直连",
  "DOMAIN-SUFFIX,fastly.net,直连",
  "DOMAIN-SUFFIX,edgecastcdn.net,直连",
  "DOMAIN-SUFFIX,edgesuite.net,直连",
  "DOMAIN-SUFFIX,vrmoqu.com,直连",
  "DOMAIN-SUFFIX,vrmoo.co,直连",
  "DOMAIN-SUFFIX,quip.com,直连",
  "DOMAIN-KEYWORD,atianqi,直连",
  "DOMAIN-KEYWORD,tc.qq,直连",
  "DOMAIN-KEYWORD,moviets.tc.qq.com,直连",
  "DOMAIN-SUFFIX,atianqi.com,直连",
  "DOMAIN-SUFFIX,qpic.cn,直连",
  "DOMAIN-SUFFIX,gtimg.cn,直连",
  "DOMAIN-SUFFIX,on.aws,直连",
  "DOMAIN-SUFFIX,dcloud.io,直连",
  "DOMAIN-SUFFIX,myqcloud.com,直连",
  "DOMAIN-SUFFIX,cowtransfer.com,直连",
  "DOMAIN-SUFFIX,insi.chat,直连",
  "DOMAIN-SUFFIX,zzzdm.com,直连",
  "DOMAIN-SUFFIX,cdn.cloudflare.net,直连",

  // ============================================
  // 阿里系 - 国内直连
  // ============================================
  "DOMAIN-SUFFIX,dingtalk.com,直连",
  "DOMAIN-SUFFIX,dingtalkapps.com,直连",
  "DOMAIN-SUFFIX,aliyun.com,直连",
  "DOMAIN-SUFFIX,taobao.com,直连",
  "DOMAIN-SUFFIX,alicdn.com,直连",
  "DOMAIN-SUFFIX,alibaba.com,直连",
  "DOMAIN-SUFFIX,alipay.com,直连",
  "DOMAIN-SUFFIX,alipayobjects.com,直连",

  // ============================================
  // 端口直连
  // ============================================
  "SRC-PORT,6672,直连",
  "DST-PORT,6672,直连",
  "DST-PORT,61455,直连",
  "DST-PORT,61456,直连",
  "DST-PORT,61457,直连",
  "DST-PORT,61458,直连",

  // ============================================
  // DDNS 服务 - 必须直连获取真实 IP
  // ============================================
  "DOMAIN-KEYWORD,synology,直连",
  "DOMAIN-KEYWORD,quickconnect,直连",
  "DOMAIN-SUFFIX,checkip.dyndns.org,直连",
  "DOMAIN-SUFFIX,checkipv6.dyndns.org,直连",
  "DOMAIN-SUFFIX,checkip.synology.com,直连",
  "DOMAIN-SUFFIX,ifconfig.co,直连",
  "DOMAIN-SUFFIX,api.myip.com,直连",
  "DOMAIN-SUFFIX,ip-api.com,直连",
  "DOMAIN-SUFFIX,ipapi.co,直连",
  "DOMAIN-SUFFIX,ip6.seeip.org,直连",
  "DOMAIN-SUFFIX,members.3322.org,直连",

  // ============================================
  // 避开加速器
  // ============================================
  "PROCESS-NAME,MuXunAccelerator.exe,直连",
  "PROCESS-NAME,MuXunHttp.exe,直连",
  "PROCESS-NAME,MuXunProxy.exe,直连",
  "PROCESS-NAME,mxtools.exe,直连",
  "PROCESS-NAME,PaoFu.exe,直连",
  "PROCESS-NAME,liuxing.exe,直连",
  "PROCESS-NAME,LXProxy.exe,直连",
  "PROCESS-NAME,heyboxacc.exe,直连",
  "PROCESS-NAME,heyboxfilter.exe,直连",
  "PROCESS-NAME,heyboxbrowser.exe,直连",

  // ============================================
  // AI 工具
  // ============================================
  "PROCESS-PATH-REGEX,.*Antigravity.*,谷歌服务",
  "DOMAIN-KEYWORD,antigravity,谷歌服务",
  "PROCESS-PATH-REGEX,.*Cursor.*,其他AI",
  "PROCESS-PATH-REGEX,.*VSCode.*,其他AI",

  // ============================================
  // Meta / Oculus 服务 - 强制走美国
  // ============================================
  // [优化] 用 GEOSITE/GEOIP 覆盖全部 Meta 服务
  // meta-rules-dat 已收录：facebook/instagram/whatsapp/threads
  "GEOSITE,facebook,US美国",
  "GEOSITE,instagram,US美国",
  "GEOSITE,whatsapp,US美国",
  "GEOSITE,threads,US美国",
  // Meta 品牌域名（geosite 未收录，需手动维护）
  "DOMAIN-SUFFIX,meta.com,US美国",
  "DOMAIN-SUFFIX,metanetwork.com,US美国",
  // Oculus VR 服务（geosite 无 oculus 分类，需手动维护）
  "DOMAIN-SUFFIX,oculus.com,US美国",
  "DOMAIN-SUFFIX,oculusvr.com,US美国",
  "DOMAIN-SUFFIX,oculuscdn.com,US美国",
  "DOMAIN-KEYWORD,oculus,US美国",

  // ============================================
  // VRC 国内资源站 - 直连
  // ============================================
  "DOMAIN-SUFFIX,91vrchat.com,直连",
  "DOMAIN-SUFFIX,dm5.world,直连",
  "DOMAIN-SUFFIX,dm5.today,直连",
  "DOMAIN-KEYWORD,ffzy-online,直连",
  "DOMAIN-KEYWORD,ffzy-play,直连",
  "DOMAIN-KEYWORD,bilivideo,直连",

  // ============================================
  // VRChat 完整规则
  // ============================================
  // VRChat 核心服务 & API
  "DOMAIN-SUFFIX,vrchat.com,游戏专用",
  "DOMAIN-SUFFIX,vrchat.cloud,游戏专用",
  "DOMAIN-SUFFIX,vrch.at,游戏专用",
  // Photon 游戏联机引擎 (VRChat 的心脏，负责动作同步)
  "DOMAIN-SUFFIX,photonengine.com,游戏专用",
  "DOMAIN-SUFFIX,photonengine.cn,游戏专用",
  "DOMAIN-SUFFIX,photonengine.io,游戏专用",
  "DOMAIN-SUFFIX,exitgames.com,游戏专用",
  // VRChat 视频播放器与 CDN
  "DOMAIN-SUFFIX,vrcdn.live,游戏专用",
  "DOMAIN-SUFFIX,vrcdn.video,游戏专用",
  "DOMAIN-SUFFIX,vrcdn.cloud,游戏专用",
  // VRChat 兜底关键词匹配
  "DOMAIN-KEYWORD,vrchat,游戏专用",
  // Photon 联机引擎 - 官方端口（UDP）
  "DST-PORT,5055,游戏专用",   // Master Server
  "DST-PORT,5056,游戏专用",   // Game Server
  "DST-PORT,5058,游戏专用",   // Name Server
  "DST-PORT,27000,游戏专用",  // Name Server (备用)
  "DST-PORT,27001,游戏专用",  // Master Server (备用)
  "DST-PORT,27002,游戏专用",  // Game Server (备用)
  "DST-PORT,50004,游戏专用",  // VRChat 可能使用的额外端口

  // ============================================
  // 其他游戏相关
  // ============================================
  "PROCESS-PATH-REGEX,.*\\\\BattlEye\\\\.*\\.*$,游戏专用",
  "PROCESS-PATH-REGEX,.*\\\\Rockstar Games\\\\.*\\.*$,游戏专用",
  "PROCESS-PATH-REGEX,.*\\\\Grand Theft Auto V Enhanced\\\\.*\\.*$,游戏专用",
  "PROCESS-NAME,Asphalt8.*,游戏专用",
  "PROCESS-NAME,stalcraftw.*,游戏专用",
  "DOMAIN-SUFFIX,unity3d.com,游戏专用",
  // Beat Saber 相关
  "DOMAIN-SUFFIX,beatleader.xyz,游戏专用",
  "DOMAIN-SUFFIX,beatsaver.com,游戏专用",

  // ============================================
  // NatTypeTester / STUN
  // ============================================
  "DOMAIN-SUFFIX,stun.syncthing.net,默认节点",
  "DOMAIN-SUFFIX,stun.hot-chilli.net,默认节点",
  "DOMAIN-SUFFIX,stun.fitauto.ru,默认节点",
  "DOMAIN-SUFFIX,stun.miwifi.com,默认节点",

  // ============================================
  // 谷歌服务强制
  // ============================================
  "DOMAIN-SUFFIX,googletagservices.com,谷歌服务",
  "DOMAIN-SUFFIX,googleadservices.com,谷歌服务",
  "DOMAIN-SUFFIX,googlesyndication.com,谷歌服务",
  "DOMAIN-SUFFIX,googleapis.com,谷歌服务",
  "DOMAIN-SUFFIX,googleapis.cn,谷歌服务",
  "DOMAIN-SUFFIX,google-analytics.com,谷歌服务",
  "DOMAIN-SUFFIX,google.com,谷歌服务",
  "DOMAIN-SUFFIX,gstatic.com,谷歌服务",

  // ============================================
  // 自定义代理
  // ============================================
  "DOMAIN,hgamefree.info,SG新加坡",
  "DOMAIN,newipnow.com,默认节点",
  "DOMAIN-SUFFIX,paypalobjects.com,默认节点",
  "DOMAIN-SUFFIX,paypal.com,默认节点",
  "DOMAIN-SUFFIX,twitch.tv,默认节点",
  "DOMAIN-SUFFIX,twitchcdn.com,默认节点",
  "DOMAIN-SUFFIX,twitch.tv.hls.ttvnw.net,默认节点",
  "DOMAIN-SUFFIX,tl.twitch.tv,默认节点",
  "DOMAIN-SUFFIX,api.twitch.tv,默认节点",
  "DOMAIN-SUFFIX,ttvnw.net,默认节点",
  "DOMAIN-SUFFIX,coub.com,默认节点",
  "DOMAIN-SUFFIX,sgtools.info,默认节点",
  "DOMAIN-SUFFIX,barter.vg,默认节点",
  "DOMAIN-SUFFIX,coinbase.com,默认节点",
  "DOMAIN-SUFFIX,clockify.me,默认节点",
  "DOMAIN-SUFFIX,rule34.xxx,默认节点",
  "DOMAIN-SUFFIX,stripe.com,默认节点",
  "DOMAIN-SUFFIX,herokuapp.com,默认节点",
  "DOMAIN-SUFFIX,chronodivide.com,默认节点",
  "DOMAIN-SUFFIX,minergate.com,默认节点",
  "DOMAIN-SUFFIX,trellocdn.com,默认节点",
  "DOMAIN-SUFFIX,manhuagui.com,默认节点",
  "DOMAIN-SUFFIX,medium.com,默认节点",
  "DOMAIN-SUFFIX,seeseed.com,默认节点",
  "DOMAIN-SUFFIX,allcdcovers.com,默认节点",
  "DOMAIN-SUFFIX,visualhunt.com,默认节点",
  "DOMAIN-SUFFIX,dropbox.com,默认节点",
  "DOMAIN-SUFFIX,adobe.com,默认节点",
  "DOMAIN-SUFFIX,adobecc.com,默认节点",
  "DOMAIN-SUFFIX,smart2pay.com,默认节点",
  "DOMAIN-SUFFIX,githubapp.com,默认节点",
  "DOMAIN-SUFFIX,githubassets.com,默认节点",
  "DOMAIN-SUFFIX,github.io,默认节点",
  "DOMAIN-SUFFIX,github.com,默认节点",
  "DOMAIN-SUFFIX,githubusercontent.com,默认节点",
  "DOMAIN-SUFFIX,azure.cn,默认节点",
  "DOMAIN-SUFFIX,adobe.io,默认节点",
  "DOMAIN-SUFFIX,doubleclick.net,默认节点",
  "DOMAIN-SUFFIX,msecnd.net,默认节点",
  "DOMAIN-SUFFIX,demdex.net,默认节点",
  "DOMAIN-SUFFIX,dnxp.net,默认节点",
  "DOMAIN-SUFFIX,deepin.org,默认节点",
  "DOMAIN-SUFFIX,huobi.vc,默认节点",
  "DOMAIN-SUFFIX,monica.im,默认节点",
  "DOMAIN-SUFFIX,manhuabika.com,默认节点",
  "DOMAIN-SUFFIX,nexusmods.com,默认节点",
  "DOMAIN-SUFFIX,recaptcha.net,默认节点",
  "DOMAIN-KEYWORD,kemono,默认节点",
  "DOMAIN-SUFFIX,api.telegram.org,TG-BOT-API",

  // ============================================
  // Binance 交易所完整规则
  // ============================================
  // Binance 核心交易所域名
  "DOMAIN-SUFFIX,binance.com,Binance",
  "DOMAIN-SUFFIX,binance.us,Binance",
  "DOMAIN-SUFFIX,binance.org,Binance",
  "DOMAIN-SUFFIX,binance.cloud,Binance",
  "DOMAIN-SUFFIX,binance.info,Binance",
  "DOMAIN-SUFFIX,binance.me,Binance",
  // Binance 中国大陆备用域名
  "DOMAIN-SUFFIX,binancecom.net,Binance",
  "DOMAIN-SUFFIX,binance8080.com,Binance",
  "DOMAIN-SUFFIX,binancedown.com,Binance",
  "DOMAIN-SUFFIX,binance2.com,Binance",
  "DOMAIN-SUFFIX,binanceru.net,Binance",
  // Binance 静态资源 CDN
  "DOMAIN-SUFFIX,bnbstatic.com,Binance",
  // BNB Chain 生态
  "DOMAIN-SUFFIX,bnbchain.org,Binance",
  // Binance 兜底关键词匹配（覆盖未来新增子域名）
  "DOMAIN-KEYWORD,binance,Binance",
];

/**
 * 分流规则配置，会自动生成对应的策略组
 * 设置的时候可遵循“最小，可用”原则，把自己不需要的规则全禁用掉，提高效率
 * true = 启用
 * false = 禁用
 */
const ruleOptions = {
  apple: true, // 苹果服务
  microsoft: true, // 微软服务
  google: true, // Google服务
  openai: true, // 国外AI和GPT
  spotify: true, // Spotify
  youtube: true, // YouTube
  bahamut: false, // 巴哈姆特/动画疯
  netflix: false, // Netflix网飞
  tiktok: false, // 国际版抖音
  disney: false, // 迪士尼
  pixiv: false, // Pixiv
  hbo: false, // HBO
  biliintl: false, // 哔哩哔哩东南亚
  tvb: false, // TVB
  hulu: false, // Hulu
  primevideo: false, // 亚马逊prime video
  telegram: true, // Telegram通讯软件
  line: false, // Line通讯软件
  whatsapp: false, // Whatsapp
  games: true, // 游戏策略组
  japan: true, // 日本网站策略组
  binance: true, // Binance 交易所
  tracker: false, // 网络分析和跟踪服务
  ads: false, // 常见的网络广告
};

/**
 * 地区配置，通过regex匹配代理节点名称
 * regex会有一定概率误判，自己调整一下吧
 * excludeHighPercentage是排除高倍率节点的开关，只对地区分组有效
 * 倍率大于regions里的ratioLimit值的代理节点会被排除
 */
const regionOptions = {
  excludeHighPercentage: true,
  regions: [
    {
      name: "HK香港",
      regex: /港|🇭🇰|hk|hongkong|hong kong/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Hong_Kong.png",
    },
    {
      name: "US美国",
      // [优化] 使用负向前瞻排除 Australia/Austria 等误匹配
      regex: /(?!.*aus)(?=.*(美|🇺🇸|us(?!t)|usa|american|united states)).*/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/United_States.png",
    },
    {
      name: "JP日本",
      regex: /日本|🇯🇵|jp|japan/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Japan.png",
    },
    {
      name: "KR韩国",
      regex: /韩|🇰🇷|kr|korea/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Korea.png",
    },
    {
      name: "SG新加坡",
      regex: /新加坡|🇸🇬|sg|singapore/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Singapore.png",
    },
    {
      name: "CN中国大陆",
      regex: /中国|cn|china/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/China.png",
    },
    {
      name: "TW台湾",
      regex: /台湾|🇹🇼|tw|taiwan|tai wan/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Taiwan.png",
    },
    {
      name: "GB英国",
      regex: /英|🇬🇧|uk|united kingdom|great britain/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/United_Kingdom.png",
    },
    {
      name: "DE德国",
      regex: /德国|🇩🇪|de|germany/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Germany.png",
    },
    {
      name: "MY马来西亚",
      regex: /马来|🇩🇪|my|malaysia/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Malaysia.png",
    },
    {
      name: "TK土耳其",
      regex: /土耳其|🇹🇷|tk|turkey/i,
      ratioLimit: 2,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Turkey.png",
    },
  ],
};

/**
 * [优化] 预编译倍率正则，避免每次循环时重复创建正则对象
 */
const multiplierRegex = /(?<=[xX✕✖⨉倍率])([1-9]+(\.\d+)*|0{1}\.\d+)(?=[xX✕✖⨉倍率])*/i;

/**
 * 其实两组DNS就够了，一组国内，一组国外
 * defaultDNS是用来解析DNS的，必须为IP
 * DNS最好不要超过两个，从业界某知名APP的文档里学的
 */
const defaultDNS = ["tls://223.5.5.5"];

const chinaDNS = ["119.29.29.29", "223.5.5.5"];

const foreignDNS = [
  "https://120.53.53.53/dns-query",
  "https://223.5.5.5/dns-query",
];

/**
 * DNS相关配置
 */
/**
 * [优化] DNS 配置改用 whitelist 模式
 * 原 blacklist 模式需要手动排除国内域名，容易遗漏
 * whitelist 模式只对命中的域名使用 Fake-IP，更精准
 */
const dnsConfig = {
  enable: true,
  listen: ":1053",
  ipv6: false,
  "prefer-h3": true,
  "use-hosts": true,
  "use-system-hosts": true,
  "respect-rules": true,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  /**
   * [优化] 
   * - 原 blacklist 模式的 "*" 会匹配全部，修正并追加完整的判定
   */
  "fake-ip-filter": [
    "*.lan",
    "*.local",
    "*.localdomain",
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    "+.market.xiaomi.com",
    // SSH 协议不在 Sniffer 嗅探范围，Fake-IP 会导致 git push/pull 失败
    "+.github.com",
    "+.gitlab.com",
    "+.bitbucket.org",
    "geosite:cn",                    // 国内域名返回真实 IP
    "geosite:private",               // 内网域名
    "geosite:apple@cn",              // 苹果国内服务
    "geosite:microsoft@cn",          // 微软国内服务
    "geosite:steam@cn",              // Steam 国区
    "geosite:category-games@cn",     // 国内游戏
  ],
  "default-nameserver": [...defaultDNS],
  /**
   * [优化] 默认 DNS 改为国内 DNS
   * - 原配置使用国外 DNS，启动时解析节点域名可能较慢
   * - 改用国内 DNS 启动更稳定，GFW 域名通过 nameserver-policy 分流到国外 DNS
   * - proxy-server-nameserver 仍用纯 IP，确保节点域名解析稳定
   */
  nameserver: [...chinaDNS],
  "proxy-server-nameserver": [...chinaDNS],
  "nameserver-policy": {
    "geosite:private": "system",
    "geosite:tld-cn,cn,steam@cn,category-games@cn,microsoft@cn,apple@cn": chinaDNS,
    // [优化] GFW 域名走国外 DNS 防止污染
    "geosite:gfw,jetbrains-ai,category-ai-!cn,category-ai-chat-!cn": foreignDNS,
  },
};

// 规则集通用配置
const ruleProviderCommon = {
  type: "http",
  format: "yaml",
  interval: 86400,
};

// 代理组通用配置
const groupBaseOption = {
  interval: 300,
  timeout: 3000,
  url: "http://cp.cloudflare.com/generate_204",
  lazy: true,
  "max-failed-times": 3,
  hidden: false,
};

const ruleProviders = new Map();
ruleProviders.set("applications", {
  ...ruleProviderCommon,
  behavior: "classical",
  format: "text",
  url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt",
  path: "./ruleset/Loyalsoldier/applications.txt",
});

let rules = [
  ...customRules,
  "RULE-SET,applications,下载软件",
  "PROCESS-NAME,SunloginClient,DIRECT",
  "PROCESS-NAME,SunloginClient.exe,DIRECT",
];

// 程序入口
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount =
    typeof config?.["proxy-providers"] === "object"
      ? Object.keys(config["proxy-providers"]).length
      : 0;
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理");
  }

  // ============================================
  // 自动提取代理节点服务器地址，生成直连规则防止回环
  // ============================================
  const proxyServerRules = [];
  const seenServers = new Set();
  
  if (config.proxies && Array.isArray(config.proxies)) {
    config.proxies.forEach((proxy) => {
      const server = proxy.server;
      if (server && !seenServers.has(server)) {
        seenServers.add(server);
        // 判断是 IP 还是域名
        const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(server) || 
                     /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(server);
        if (isIP) {
          // IPv4 或 IPv6
          proxyServerRules.push(`IP-CIDR,${server}/32,DIRECT,no-resolve`);
        } else {
          // 域名
          proxyServerRules.push(`DOMAIN,${server},DIRECT`);
        }
      }
    });
  }
  
  console.log(`[INFO] 已提取 ${proxyServerRules.length} 个代理服务器地址加入直连规则`);

  // [优化] 自动提取代理节点服务器地址，生成直连规则防止流量回环
  // 原脚本无此逻辑，代理服务器域名可能被二次代理导致连不上
  let regionProxyGroups = [];
  let otherProxyGroups = config.proxies.map((b) => {
    return b.name;
  });

  config["allow-lan"] = true;

  config["bind-address"] = "*";

  config["mode"] = "rule";

  // 设置日志等级为 warning，减少路由器 IO 压力
  config["log-level"] = "warning";

  // 覆盖原配置中DNS配置
  config["dns"] = dnsConfig;

  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true,
  };

  config["unified-delay"] = true;

  config["tcp-concurrent"] = true;

  /**
   * 这个值设置大点能省电，笔记本和手机需要关注一下
   */
  config["keep-alive-interval"] = 1800;

  config["find-process-mode"] = "strict";

  config["geodata-mode"] = true;

  /**
   * 适合小内存环境，如果在旁路由里运行可以改成standard
   */
  config["geodata-loader"] = "memconservative";

  config["geo-auto-update"] = true;

  config["geo-update-interval"] = 24;

  /**
   * [优化] Sniffer 配置
   * 添加 skip-src/dst-address 排除内网范围，减少不必要的嗅探
   * force-domain 添加常见 CDN 域名确保正确嗅探
   */
  const skipIps = [
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "198.18.0.0/16",
    "FC00::/7",
    "FE80::/10",
    "::1/128",
  ];
  config["sniffer"] = {
    enable: true,
    "force-dns-mapping": true,
    /**
     * parse-pure-ip: false - 不嵅探纯 IP 请求，减少开销
     * override-destination: true - 用嵅探结果（SNI/Host）覆盖目标地址
     *   作用：应用直连 IP 时，嵅探出域名后用域名进行规则匹配
     *   对 CDN/Google 等域名代理更准确，配合 skip-address 不影响局域网
     */
    "parse-pure-ip": false,
    "override-destination": true,
    sniff: {
      TLS: {
        ports: [443, 8443],
      },
      HTTP: {
        ports: [80, "8080-8880"],
      },
      QUIC: {
        ports: [443, 8443],
      },
    },
    // [优化] 排除内网地址，减少不必要的嗅探开销
    "skip-src-address": skipIps,
    "skip-dst-address": skipIps,
    // [优化] 强制嗅探常见 CDN 域名，确保代理生效
    "force-domain": [
      "+.google.com",
      "+.googleapis.com",
      "+.googleusercontent.com",
      "+.youtube.com",
      "+.facebook.com",
      "+.messenger.com",
      "+.fbcdn.net",
    ],
    "skip-domain": ["Mijia Cloud", "+.oray.com"],
  };

  /**
   * write-to-system如果设为true的话，有可能出现电脑时间不对的问题
   */
  config["ntp"] = {
    enable: true,
    "write-to-system": false,
    server: "cn.ntp.org.cn",
  };

  // [优化] Geo 资源改用 CDN 代理，国内拉取更稳定
  config["geox-url"] = {
    geoip:
      "https://cdn.gh-proxy.org/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
    geosite:
      "https://cdn.gh-proxy.org/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    // [优化] 改用 geoip.metadb 替代 country-lite.mmdb，ASN 匹配更精准
    mmdb: "https://cdn.gh-proxy.org/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb",
    asn: "https://cdn.gh-proxy.org/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb",
  };

  /**
   * 总开关关闭时不处理策略组
   */
  if (!enable) {
    return config;
  }

  regionOptions.regions.forEach((region) => {
    /**
     * 提取倍率符合要求的代理节点
     * [优化] 使用预编译的 multiplierRegex 替代内联正则，避免循环内重复创建
     */
    let proxies = config.proxies
      .filter((a) => {
        if (!a.name.match(region.regex)) return false;
        // "实验性"节点无条件保留，不受倍率限制
        if (a.name.includes('实验性')) return true;
        // [优化] 使用顶部预编译的 multiplierRegex
        const multiplier = multiplierRegex.exec(a.name)?.[1];
        return parseFloat(multiplier || "0") <= region.ratioLimit;
      })
      .map((b) => {
        return b.name;
      });

    /**
     * 必须再判断一下有没有符合要求的代理节点
     * 没有的话，这个策略组就不应该存在
     * 游戏和一些对IP切换敏感的站点用"手选固定"
     * IP切换无负面影响以及自己机场节点经常炸的用"自动测速"
     */
    if (proxies.length > 0) {
      // [优化] 每个地区同时创建 select + url-test 两种策略组
      // 原脚本只创建一种（lazy: url-test / global: url-test）
      // 双类型让用户可以手动固定节点（select），也可以自动测速（url-test）

      // 手选固定 select 类型策略组
      regionProxyGroups.push({
        ...groupBaseOption,
        name: region.name,
        type: "select",
        icon: region.icon,
        proxies: proxies,
      });

      // 自动测速 url-test 类型策略组
      regionProxyGroups.push({
        ...groupBaseOption,
        name: `自动测速-${region.name}`, // 自动测速策略组名称
        type: "url-test",
        tolerance: 50, // 容忍延迟
        interval: 60, // 每分钟自动测速
        url: "http://cp.cloudflare.com/generate_204", // 测速 URL
        icon: region.icon,
        proxies: proxies,
      });
    }

    otherProxyGroups = otherProxyGroups.filter((x) => !proxies.includes(x));
  });

  // 将自动测速的策略组移到不自动测速的策略组之后
  const selectGroups = regionProxyGroups.filter(
    (group) => group.type === "select"
  );
  const urlTestGroups = regionProxyGroups.filter(
    (group) => group.type === "url-test"
  );
  regionProxyGroups = [...selectGroups, ...urlTestGroups];

  // 统一自动测速分组：收集所有代理节点（Lite 版中节点已被精简，自然只含实验性节点）
  const allProxyNames = config.proxies
    .filter((p) => p.type !== 'direct')
    .map((p) => p.name);
  if (allProxyNames.length > 0) {
    regionProxyGroups.push({
      ...groupBaseOption,
      name: '自动测速',
      type: 'url-test',
      tolerance: 50,
      proxies: allProxyNames,
      icon: 'https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Auto.png',
    });
  }

  // [新增] 故障转移分组
  const failoverOrder = ["HK香港", "JP日本", "SG新加坡", "TW台湾"];
  const failoverProxies = [];
  failoverOrder.forEach((regionName) => {
    if (regionProxyGroups.some(g => g.name === `自动测速-${regionName}`)) {
      failoverProxies.push(`自动测速-${regionName}`);
    }
  });

  if (failoverProxies.length > 0) {
    regionProxyGroups.push({
      ...groupBaseOption,
      name: "故障转移",
      type: "fallback",
      interval: 60, // 每分钟对组内节点测延迟
      timeout: 150, // 超过150ms延迟不予采用，自动fallback到下一个
      url: "http://cp.cloudflare.com/generate_204",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Available.png",
      proxies: failoverProxies,
    });
  }

  const proxyGroupsRegionNames = regionProxyGroups.map((value) => {
    return value.name;
  });

  if (otherProxyGroups.length > 0) {
    proxyGroupsRegionNames.push("其他节点");
  }

  const hasUSProxy = proxyGroupsRegionNames.includes("US美国");
  const hasSGProxy = proxyGroupsRegionNames.includes("SG新加坡");
  const hasJPProxy = proxyGroupsRegionNames.includes("JP日本");
  const hasJPAutoProxy = proxyGroupsRegionNames.includes("自动测速-JP日本");
  const hasSGAutoProxy = proxyGroupsRegionNames.includes("自动测速-SG新加坡");

  // [优化] 默认节点 HK 优先排序
  // 原脚本无排序，直接 [...regionNames, '直连']
  // 通常情况下香港延迟最低，放首位减少手动选择
  const hasHKProxyDefault = proxyGroupsRegionNames.includes("HK香港");
  const defaultProxies = hasHKProxyDefault 
    ? ["HK香港", ...proxyGroupsRegionNames.filter(n => n !== "HK香港"), "直连"]
    : [...proxyGroupsRegionNames, "直连"];
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      name: "默认节点",
      type: "select",
      proxies: defaultProxies,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Proxy.png",
    },
  ];

  config.proxies = config?.proxies || [];
  config.proxies.push({
    name: "直连",
    type: "direct",
    udp: true,
  });

  if (ruleOptions.openai) {
    const jpFirstProxies = Array.from(
      new Set(
        hasJPProxy
          ? ["JP日本", "默认节点", ...proxyGroupsRegionNames, "直连"]
          : ["默认节点", ...proxyGroupsRegionNames, "直连"]
      )
    );

    const usFirstProxies = Array.from(
      new Set(
        hasUSProxy
          ? ["US美国", "默认节点", ...proxyGroupsRegionNames, "直连"]
          : ["默认节点", ...proxyGroupsRegionNames, "直连"]
      )
    );

    const sgFirstProxies = Array.from(
      new Set(
        hasSGProxy
          ? ["SG新加坡", "默认节点", ...proxyGroupsRegionNames, "直连"]
          : ["默认节点", ...proxyGroupsRegionNames, "直连"]
      )
    );

    // Claude Code
    rules.push(
      "DOMAIN-SUFFIX,anthropic.com,Claude Code",
      "DOMAIN-SUFFIX,claude.ai,Claude Code",
      "DOMAIN-KEYWORD,claude,Claude Code",
      "DOMAIN-SUFFIX,anthropic.com.cdn.cloudflare.net,Claude Code"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Claude Code",
      type: "select",
      proxies: sgFirstProxies,
      url: "https://www.anthropic.com",
      icon: "https://fastly.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/png/claude-ai.png",
    });

    // Openai
    rules.push(
      "DOMAIN-SUFFIX,openai.com,Openai",
      "DOMAIN-SUFFIX,chatgpt.com,Openai",
      "DOMAIN-SUFFIX,oaistatic.com,Openai",
      "DOMAIN-SUFFIX,oaiusercontent.com,Openai"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Openai",
      type: "select",
      proxies: usFirstProxies,
      url: "https://chat.openai.com/cdn-cgi/trace",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/ChatGPT.png",
    });

    // Gemini
    rules.push(
      "DOMAIN-SUFFIX,gemini.google.com,Gemini",
      "DOMAIN-SUFFIX,bard.google.com,Gemini",
      "DOMAIN-SUFFIX,generativelanguage.googleapis.com,Gemini",
      "DOMAIN-SUFFIX,generativeai.google,Gemini",
      "DOMAIN-KEYWORD,gemini,Gemini"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Gemini",
      type: "select",
      proxies: usFirstProxies,
      url: "https://gemini.google.com",
      icon: "https://fastly.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/png/google-gemini.png",
    });

    // Minimax
    rules.push(
      "DOMAIN-SUFFIX,minimax.chat,Minimax",
      "DOMAIN-SUFFIX,minimaxi.com,Minimax",
      "DOMAIN-SUFFIX,minimax.io,Minimax",
      "DOMAIN-SUFFIX,hailuoai.com,Minimax",
      "DOMAIN-SUFFIX,hailuoai.video,Minimax",
      "DOMAIN-KEYWORD,minimax,Minimax",
      "DOMAIN-KEYWORD,hailuoai,Minimax"
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Minimax",
      type: "select",
      proxies: jpFirstProxies,
      url: "https://hailuoai.video/",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Bot.png",
    });

    // 其他AI
    rules.push(
      "DOMAIN-SUFFIX,grazie.ai,其他AI",
      "DOMAIN-SUFFIX,grazie.aws.intellij.net,其他AI",
      "RULE-SET,ai,其他AI"
    );
    ruleProviders.set("ai", {
      ...ruleProviderCommon,
      behavior: "classical",
      format: "text",
      url: "https://github.com/dahaha-365/YaNet/raw/refs/heads/dist/rulesets/mihomo/ai.list",
      path: "./ruleset/YaNet/ai.list",
    });
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "其他AI",
      type: "select",
      proxies: jpFirstProxies,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Bot.png",
    });
  }

  if (ruleOptions.games) {
    rules.push(
      "GEOSITE,category-games@cn,国内网站",
      "GEOSITE,category-games,游戏专用"
    );
    const gameProxies = Array.from(
      new Set(["默认节点", ...proxyGroupsRegionNames, "直连"])
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "游戏专用",
      type: "select",
      proxies: gameProxies,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Game.png",
    });
  }

  if (ruleOptions.telegram) {
    rules.push("GEOIP,telegram,Telegram");
    // [设置] TG默认改回默认
    const tgProxies = ["默认节点", ...proxyGroupsRegionNames, "直连"];
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Telegram",
      type: "select",
      proxies: tgProxies,
      url: "http://www.telegram.org/img/website_icon.svg",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Telegram.png",
    });

    // 新增 TG-BOT-API 分组
    const tgFastProxies = config.proxies
      .filter((proxy) =>
        /日本|香港|台湾|荷兰|新加坡|马来西亚|JP|HK|TW|NL|SG|MY/i.test(
          proxy.name
        )
      )
      .map((proxy) => proxy.name);

    if (tgFastProxies.length > 0) {
      // 添加专门为 api.telegram.org 的规则
      config["proxy-groups"].push({
        ...groupBaseOption,
        name: "TG-BOT-API",
        type: "url-test",
        proxies: tgFastProxies,
        url: "https://api.telegram.org",
        tolerance: 50, // 容忍延迟
        icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Telegram.png",
      });
    }
  }

  if (ruleOptions.youtube) {
    rules.push("GEOSITE,youtube,YouTube");
    // [优化] YouTube：SG新加坡 优先排序
    // SG 节点到 YouTube 服务器延迟低限制最少
    const hasSGProxy = proxyGroupsRegionNames.includes("SG新加坡");
    const ytProxies = hasSGProxy
      ? ["SG新加坡", "默认节点", ...proxyGroupsRegionNames.filter(n => n !== "SG新加坡"), "直连"]
      : ["默认节点", ...proxyGroupsRegionNames, "直连"];
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "YouTube",
      type: "select",
      proxies: ytProxies,
      url: "https://www.youtube.com/s/desktop/494dd881/img/favicon.ico",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/YouTube.png",
    });
  }

  if (ruleOptions.biliintl) {
    rules.push("GEOSITE,biliintl,哔哩哔哩东南亚");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "哔哩哔哩东南亚",
      type: "select",
      proxies: ["默认节点", "直连", ...proxyGroupsRegionNames],
      url: "https://www.bilibili.tv/",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/bilibili_3.png",
    });
  }

  if (ruleOptions.bahamut) {
    rules.push("GEOSITE,bahamut,巴哈姆特");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "巴哈姆特",
      type: "select",
      proxies: ["默认节点", "直连", ...proxyGroupsRegionNames],
      url: "https://ani.gamer.com.tw/ajax/getdeviceid.php",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Bahamut.png",
    });
  }

  if (ruleOptions.disney) {
    rules.push("GEOSITE,disney,Disney+");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Disney+",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://disney.api.edge.bamgrid.com/devices",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Disney+.png",
    });
  }

  if (ruleOptions.netflix) {
    rules.push("GEOSITE,netflix,NETFLIX");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "NETFLIX",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://api.fast.com/netflix/speedtest/v2?https=true",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Netflix.png",
    });
  }

  if (ruleOptions.tiktok) {
    rules.push("GEOSITE,tiktok,Tiktok");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Tiktok",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://www.tiktok.com/",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/TikTok.png",
    });
  }

  if (ruleOptions.spotify) {
    rules.push("GEOSITE,spotify,Spotify");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Spotify",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "http://spclient.wg.spotify.com/signup/public/v1/account",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Spotify.png",
    });
  }

  if (ruleOptions.pixiv) {
    rules.push("GEOSITE,pixiv,Pixiv");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Pixiv",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "http://spclient.wg.spotify.com/signup/public/v1/account",
      icon: "https://play-lh.googleusercontent.com/8pFuLOHF62ADcN0ISUAyEueA5G8IF49mX_6Az6pQNtokNVHxIVbS1L2NM62H-k02rLM=w240-h480-rw",
    });
  }

  if (ruleOptions.hbo) {
    rules.push("GEOSITE,hbo,HBO");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "HBO",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://www.hbo.com/favicon.ico",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/HBO.png",
    });
  }

  if (ruleOptions.tvb) {
    rules.push("GEOSITE,tvb,TVB");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "TVB",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://www.tvb.com/logo_b.svg",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/TVB.png",
    });
  }

  if (ruleOptions.primevideo) {
    rules.push("GEOSITE,primevideo,Prime Video");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Prime Video",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://m.media-amazon.com/images/G/01/digital/video/web/logo-min-remaster.png",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Prime_Video.png",
    });
  }

  if (ruleOptions.hulu) {
    rules.push("GEOSITE,hulu,Hulu");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Hulu",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://auth.hulu.com/v4/web/password/authenticate",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Hulu.png",
    });
  }

  if (ruleOptions.whatsapp) {
    rules.push("GEOSITE,whatsapp,WhatsApp");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "WhatsApp",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://web.whatsapp.com/data/manifest.json",
      icon: "https://static.whatsapp.net/rsrc.php/v3/yP/r/rYZqPCBaG70.png",
    });
  }

  if (ruleOptions.line) {
    rules.push("GEOSITE,line,Line");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Line",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "https://line.me/page-data/app-data.json",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Line.png",
    });
  }

  if (ruleOptions.tracker) {
    // 注意：GEOSITE,tracker 在 OpenClash 默认的 GeoSite.dat 中不存在
    // 改用规则集方式，兼容性更好
    rules.push("RULE-SET,tracker,跟踪分析");
    ruleProviders.set("tracker", {
      ...ruleProviderCommon,
      behavior: "domain",
      format: "mrs",
      url: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-httpdns.mrs",
      path: "./ruleset/MetaCubeX/category-httpdns.mrs",
    });
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "跟踪分析",
      type: "select",
      proxies: ["REJECT", "直连", "默认节点"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Reject.png",
    });
  }

  if (ruleOptions.ads) {
    rules.push("GEOSITE,category-ads-all,广告过滤");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "广告过滤",
      type: "select",
      proxies: ["REJECT", "直连", "默认节点"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Advertising.png",
    });
  }

  if (ruleOptions.apple) {
    rules.push("GEOSITE,apple-cn,苹果国内", "GEOSITE,apple,苹果国外");
    
    // 苹果国内 - 默认直连
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "苹果国内",
      type: "select",
      proxies: ["直连", "默认节点", ...proxyGroupsRegionNames],
      url: "http://www.apple.com/library/test/success.html",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Apple_2.png",
    });

    // 苹果国外 - 默认美国优先
    const appleIntlProxies = Array.from(
      new Set(
        hasUSProxy
          ? ["US美国", "默认节点", ...proxyGroupsRegionNames, "直连"]
          : ["默认节点", ...proxyGroupsRegionNames, "直连"]
      )
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "苹果国外",
      type: "select",
      proxies: appleIntlProxies,
      url: "http://www.apple.com/library/test/success.html",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Apple_2.png",
    });
  }

  if (ruleOptions.google) {
    rules.push("GEOSITE,google,谷歌服务");
    const googleProxies = Array.from(
      new Set(
        hasUSProxy
          ? ["US美国", "默认节点", ...proxyGroupsRegionNames, "直连"]
          : ["默认节点", ...proxyGroupsRegionNames, "直连"]
      )
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "谷歌服务",
      type: "select",
      proxies: googleProxies,
      url: "http://www.google.com/generate_204",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Google_Search.png",
    });
  }

  if (ruleOptions.microsoft) {
    rules.push("GEOSITE,microsoft@cn,国内网站", "GEOSITE,microsoft,微软服务");
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "微软服务",
      type: "select",
      proxies: ["默认节点", ...proxyGroupsRegionNames, "直连"],
      url: "http://www.msftconnecttest.com/connecttest.txt",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Microsoft.png",
    });
  }

  if (ruleOptions.japan) {
    rules.push(
      "RULE-SET,category-bank-jp,日本网站",
      "GEOIP,jp,日本网站,no-resolve"
    );
    ruleProviders.set("category-bank-jp", {
      ...ruleProviderCommon,
      behavior: "domain",
      format: "mrs",
      url: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/category-bank-jp.mrs",
      path: "./ruleset/MetaCubeX/category-bank-jp.mrs",
    });
    const jpProxies = Array.from(
      new Set(
        hasJPAutoProxy
          ? ["自动测速-JP日本", "默认节点", ...proxyGroupsRegionNames, "直连"]
          : ["默认节点", ...proxyGroupsRegionNames, "直连"]
      )
    );
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "日本网站",
      type: "select",
      proxies: jpProxies,
      url: "https://r.r10s.jp/com/img/home/logo/touch.png",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/JP.png",
    });
  }

  if (ruleOptions.binance) {
    // Binance：US美国 优先，SG新加坡 备选
    // Binance 全球版主要服务器在美国，SG 作为亚洲最近的合规节点备选
    const binanceProxies = (() => {
      const base = ["默认节点", ...proxyGroupsRegionNames, "直连"];
      if (hasUSProxy && hasSGProxy) {
        // US 优先，SG 第二
        return ["US美国", "SG新加坡", ...base.filter(n => n !== "US美国" && n !== "SG新加坡")];
      } else if (hasUSProxy) {
        return ["US美国", ...base.filter(n => n !== "US美国")];
      } else if (hasSGProxy) {
        // 无 US 节点时 SG 顶上
        return ["SG新加坡", ...base.filter(n => n !== "SG新加坡")];
      }
      return base;
    })();
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "Binance",
      type: "select",
      proxies: binanceProxies,
      url: "https://www.binance.com/favicon.ico",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Cryptocurrency_3.png",
    });
  }

  // [优化] 兜底规则同时使用 GEOSITE + GEOIP 双重匹配
  // 原 lazy_script 仅用 GEOIP,CN，会漏掉部分国内域名（解析前无法匹配 IP）
  // GEOSITE,cn 在 DNS 解析阶段就能匹配域名，GEOIP,cn 兜底匹配 IP
  rules.push(
    "GEOSITE,private,直连",
    "GEOIP,private,直连,no-resolve",
    "GEOSITE,cn,国内网站",
    "GEOIP,cn,国内网站,no-resolve",
    "MATCH,其他外网"
  );
  config["proxy-groups"].push(
    {
      ...groupBaseOption,
      name: "下载软件",
      type: "select",
      proxies: [
        "直连",
        "REJECT",
        "默认节点",
        "国内网站",
        ...proxyGroupsRegionNames,
      ],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Download.png",
    },
    {
      ...groupBaseOption,
      name: "其他外网",
      type: "select",
      proxies: ["默认节点", "国内网站", ...proxyGroupsRegionNames],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/Streaming!CN.png",
    },
    {
      ...groupBaseOption,
      name: "国内网站",
      type: "select",
      proxies: ["直连", "默认节点", ...proxyGroupsRegionNames],
      url: "http://wifi.vivo.com.cn/generate_204",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/StreamingCN.png",
    }
  );

  config["proxy-groups"] = config["proxy-groups"].concat(regionProxyGroups);

  // [优化] proxyServerRules 插入规则最前面
  // 确保代理服务器地址直连，防止流量回环（代理自己的服务器→死循环）
  config["rules"] = [...proxyServerRules, ...rules];
  config["rule-providers"] = Object.fromEntries(ruleProviders);

  if (otherProxyGroups.length > 0) {
    config["proxy-groups"].push({
      ...groupBaseOption,
      name: "其他节点",
      type: "select",
      proxies: otherProxyGroups,
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure/IconSet/Color/World_Map.png",
    });
  }

  // 返回修改后的配置
  return config;
}
