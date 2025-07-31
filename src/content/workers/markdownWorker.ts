import TurndownService from "turndown";

// 添加错误处理和日志记录
try {
  // 为turndownService添加额外的保护措施
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
  });

  // 自定义规则：保留代码块语言标记
  turndownService.addRule("codeBlocks", {
    filter: (node) => {
      // Ensure filter always returns a boolean
      return (
        node.nodeName === "PRE" &&
        (node.firstChild?.nodeName === "CODE") // Use optional chaining to ensure boolean return
      );
    },
    replacement: (content, node) => {
      try {
        const code = node.firstChild as HTMLElement;
        const className = code?.getAttribute("class") || "";
        const language = className.replace(/^language-/, "");
        return "\n```" + language + "\n" + (code?.textContent || "") + "\n```\n";
      } catch (err) {
        console.error("[Worker] Error in codeBlocks replacement:", err);
        return "\n```\n" + content + "\n```\n";
      }
    },
  });

  // 自定义规则：处理图片和图片说明
  turndownService.addRule("images", {
    filter: "figure",
    replacement: (content, node) => {
      try {
        const img = node.querySelector("img");
        const figcaption = node.querySelector("figcaption");

        if (!img) return content;

        const alt = img.getAttribute("alt") || "";
        const src = img.getAttribute("src") || "";
        const caption = figcaption ? figcaption.textContent : "";

        return `![${alt}](${src})${caption ? "\n*" + caption + "*" : ""}`;
      } catch (err) {
        console.error("[Worker] Error in images replacement:", err);
        return content;
      }
    },
  });

  self.addEventListener("message", (event) => {
    const { id, action, html } = event.data;

    if (action === "convert") {
      try {
        if (!html || typeof html !== 'string') {
          throw new Error("Invalid HTML input: HTML must be a non-empty string");
        }
        
        // 添加安全处理，移除可能导致崩溃的内容
        const sanitizedHtml = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // 移除脚本
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");  // 移除样式表
          
        // 转换前先验证HTML
        let testDiv = document.createElement('div');
        testDiv.innerHTML = sanitizedHtml;
        // 如果出现问题，让它在这里失败，而不是在turndown内部
        
        const markdown = turndownService.turndown(sanitizedHtml);
        
        // 检查结果是否为有效的字符串
        if (typeof markdown !== 'string' || markdown.trim() === '') {
          throw new Error("Turndown转换结果为空或无效");
        }
        
        self.postMessage({ id, markdown });
      } catch (error: any) {
        console.error("[Worker] Error converting HTML to Markdown:", error);
        // Send back message and stack trace
        self.postMessage({ 
          id, 
          error: { 
            message: error.message || "Unknown error in Markdown conversion",
            stack: error.stack 
          } 
        });
      }
    }
  });

} catch (initError) {
  // 如果初始化时出错，设置错误监听器
  console.error("[Worker] Critical initialization error:", initError);
  
  self.addEventListener("message", (event) => {
    const { id } = event.data;
    self.postMessage({ 
      id, 
      error: { 
        message: "Failed to initialize Markdown converter: " + (initError instanceof Error ? initError.message : String(initError)),
        stack: initError instanceof Error ? initError.stack : undefined
      } 
    });
  });
} 