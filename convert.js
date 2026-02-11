const fs = require("fs");
const path = require("path");
const yaml = require("./js-yaml.js");

// 支持命令行参数
const args = process.argv.slice(2);
const SOURCE_FILE = args[0] || "source.yaml";
const OUTPUT_FILE =
  args[1] || SOURCE_FILE.replace(/\.ya?ml$/i, "_openclash.yaml");
const SCRIPT_FILE = args[2] || "Clash.js"; // 默认使用 Clash.js

console.log(`
╔═══════════════════════════════════════════════════════════╗
║              OpenClash 软路由 配置转换工具                ║
╚═══════════════════════════════════════════════════════════╝
`);

try {
  const rawContent = fs.readFileSync(SOURCE_FILE, "utf8");
  let config = yaml.load(rawContent);

  console.log("📥 已加载原始订阅:", SOURCE_FILE);

  // 2. 引入并执行你的脚本逻辑
  const scriptContent = fs.readFileSync(SCRIPT_FILE, "utf8");

  // 构造沙箱执行环境
  const sandboxFactory = new Function(`
        ${scriptContent}
        return main;
    `);

  const mainFn = sandboxFactory();

  console.log("✅ 脚本解析成功，正在执行 main()...");
  config = mainFn(config);

  // 3. 【关键修正】针对 OpenClash N150 的环境适配

  // A. 过滤路由器不支持的规则类型（PROCESS 相关）
  if (config.rules && Array.isArray(config.rules)) {
    const originalCount = config.rules.length;
    config.rules = config.rules.filter((rule) => {
      // OpenClash 无法检测客户端进程，过滤掉所有 PROCESS 相关规则
      // 包括: PROCESS-NAME, PROCESS-PATH, PROCESS-NAME-REGEX, PROCESS-PATH-REGEX
      return !/^PROCESS-(NAME|PATH|NAME-REGEX|PATH-REGEX),/i.test(rule);
    });
    const removedCount = originalCount - config.rules.length;
    if (removedCount > 0) {
      console.log(`✅ 已过滤 ${removedCount} 条路由器不支持的进程规则`);
    }
  }

  // B. 修正 Rule Provider 路径 (适配 Linux/OpenWrt)
  if (config["rule-providers"]) {
    Object.keys(config["rule-providers"]).forEach((key) => {
      const provider = config["rule-providers"][key];
      if (provider.path) {
        // 将 ./ruleset/xxx 替换为 /etc/openclash/rule_provider/xxx
        const fileName = path.basename(provider.path);
        provider.path = `/etc/openclash/rule_provider/${fileName}`;
      }
    });
    console.log("✅ Rule Providers 路径已修正");
  }

  // C. [优化] 清理 OpenClash 用不上的配置项
  // 软路由用 iptables/nftables 透明代理，以下配置由 LuCI 界面管理或不适用
  const fieldsToRemove = [
    // Clash GUI 专属字段
    "cfw-latency-timeout",
    "cfw-conn-break-strategy",
    "cfw-bypass",
    "cfw-profiles",
    // 软路由不需要 TUN 模式
    "tun",
    // OpenClash 自带 yacd 面板
    "external-ui",
    "external-ui-url",
    // 端口由 LuCI 配置
    "mixed-port",
    "redir-port",
    "tproxy-port",
    // OpenClash 默认 9090
    "external-controller",
  ];
  fieldsToRemove.forEach((field) => delete config[field]);
  console.log("✅ 已清理软路由用不上的配置项");

  // D. [优化] 强制 geodata-mode 为 false（分离模式）
  // Meta 内核建议使用分离模式，内存占用更低
  config["geodata-mode"] = false;
  console.log("✅ geodata-mode 已设为 false（分离模式）");

  // 5. 导出最终 YAML
  fs.writeFileSync(OUTPUT_FILE, yaml.dump(config, { lineWidth: -1 }));

  console.log(`
═══════════════════════════════════════════════════════════
📊 统计信息:
   - 代理节点: ${config.proxies?.length || 0} 个
   - 策略组: ${config["proxy-groups"]?.length || 0} 个
   - 规则: ${config.rules?.length || 0} 条
   - 规则集: ${Object.keys(config["rule-providers"] || {}).length} 个

📤 输出文件: ${OUTPUT_FILE}

💡 使用方法:
   1. SCP 上传: scp ${OUTPUT_FILE} root@ip:/etc/openclash/config/
   2. 或通过 OpenClash Web UI 上传
═══════════════════════════════════════════════════════════
`);
} catch (e) {
  console.error("❌ 转换失败:", e.message);
  console.log(`
用法: node convert.js [源文件] [输出文件] [脚本文件]
示例: node convert.js source.yaml output.yaml Clash.js
  `);
  process.exit(1);
}
