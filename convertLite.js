const fs = require("fs");
const path = require("path");
const yaml = require("./js-yaml.js");

/**
 * convertLite.js
 * 用法: node convertLite.js [输入文件] [输出文件]
 * 
 * 转换流程: Clash.js -> convert.js -> convertLite.js
 * 
 * 功能:
 * 1. 读取 convert.js 的输出 (即 xxx_openclash.yaml)
 * 2. 仅保留节点名称包含"实验性"的代理节点
 * 3. 移除所有空的策略分组
 * 4. 输出精简版配置
 */

// 支持命令行参数
const args = process.argv.slice(2);
const INPUT_FILE = args[0] || "source_openclash.yaml";
const OUTPUT_FILE =
  args[1] || INPUT_FILE.replace(/(_openclash)?\.ya?ml$/i, "_lite.yaml");

console.log(`
╔═══════════════════════════════════════════════════════════╗
║              OpenClash 软路由 极简转换工具                ║
╚═══════════════════════════════════════════════════════════╝
`);

try {
  // 1. 读取输入配置
  const rawContent = fs.readFileSync(INPUT_FILE, "utf8");
  let config = yaml.load(rawContent);

  console.log("📥 已加载配置文件:", INPUT_FILE);

  const originalProxyCount = config.proxies?.length || 0;
  const originalGroupCount = config["proxy-groups"]?.length || 0;

  // 2. 过滤代理节点：保留"实验性"节点 + 倍率 < 1x 的节点
  // 未标注倍率的普通节点视为 1x，不保留
  const multiplierRegex = /(?<=[xX✕✖⨉倍率])([1-9]+(\.\d+)*|0{1}\.\d+)(?=[xX✕✖⨉倍率])*/i;
  if (config.proxies && Array.isArray(config.proxies)) {
    config.proxies = config.proxies.filter((proxy) => {
      const specialNodes = ["直连", "DIRECT", "REJECT", "拒绝", "全球直连"];
      if (specialNodes.some((s) => proxy.name.includes(s))) return true;
      if (proxy.name.includes("实验性")) return true;
      // 有显式倍率标注且 < 1 的节点保留
      const match = multiplierRegex.exec(proxy.name);
      if (match) return parseFloat(match[1]) < 1;
      return false; // 无倍率标注的普通节点不保留
    });
  }

  // 获取保留的节点名称列表
  const remainingProxyNames = new Set(
    (config.proxies || []).map((p) => p.name)
  );

  console.log(
    `✅ 代理节点: ${originalProxyCount} -> ${remainingProxyNames.size} (仅保留"实验性"节点)`
  );

  // 3. 更新策略组中的节点引用
  if (config["proxy-groups"] && Array.isArray(config["proxy-groups"])) {
    config["proxy-groups"] = config["proxy-groups"]
      .map((group) => {
        if (group.proxies && Array.isArray(group.proxies)) {
          // 过滤掉不存在的节点名称
          // 但保留指向其他策略组的引用（非代理节点）
          const groupNames = new Set(
            config["proxy-groups"].map((g) => g.name)
          );
          
          group.proxies = group.proxies.filter((proxyName) => {
            // 保留条件:
            // 1. 节点名称在剩余的代理节点中
            // 2. 或者是另一个策略组的名称
            // 3. 或者是内置策略 (DIRECT, REJECT 等)
            const builtInPolicies = ["DIRECT", "REJECT", "直连", "拒绝"];
            return (
              remainingProxyNames.has(proxyName) ||
              groupNames.has(proxyName) ||
              builtInPolicies.includes(proxyName)
            );
          });
        }
        return group;
      })
      // 4. 移除空的策略组（proxies 数组为空或不存在）
      .filter((group) => {
        return group.proxies && group.proxies.length > 0;
      });
  }


  // 6. 二次清理：移除引用了已删除分组的节点
  // 由于分组可能相互引用，需要多次迭代直到稳定
  let prevCount = -1;
  while (
    prevCount !== (config["proxy-groups"]?.length || 0) &&
    config["proxy-groups"]
  ) {
    prevCount = config["proxy-groups"].length;
    const validGroupNames = new Set(
      config["proxy-groups"].map((g) => g.name)
    );

    config["proxy-groups"] = config["proxy-groups"]
      .map((group) => {
        if (group.proxies) {
          group.proxies = group.proxies.filter((proxyName) => {
            const builtInPolicies = ["DIRECT", "REJECT", "直连", "拒绝"];
            return (
              remainingProxyNames.has(proxyName) ||
              validGroupNames.has(proxyName) ||
              builtInPolicies.includes(proxyName)
            );
          });
        }
        return group;
      })
      .filter((group) => group.proxies && group.proxies.length > 0);
  }

  const finalGroupCount = config["proxy-groups"]?.length || 0;
  console.log(
    `✅ 策略分组: ${originalGroupCount} -> ${finalGroupCount} (已移除空分组)`
  );

  // 6. 导出最终 YAML
  fs.writeFileSync(OUTPUT_FILE, yaml.dump(config, { lineWidth: -1 }));

  console.log(`
═══════════════════════════════════════════════════════════
📊 统计信息:
   - 代理节点: ${config.proxies?.length || 0} 个 (原 ${originalProxyCount} 个)
   - 策略组: ${finalGroupCount} 个 (原 ${originalGroupCount} 个)
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
用法: node convertLite.js [输入文件] [输出文件]
示例: node convertLite.js source_openclash.yaml output_lite.yaml

转换链路: 
  source.yaml --[convert.js]--> source_openclash.yaml --[convertLite.js]--> source_lite.yaml
  `);
  process.exit(1);
}
