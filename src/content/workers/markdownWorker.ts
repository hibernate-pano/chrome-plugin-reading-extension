import TurndownService from "turndown";

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
    const code = node.firstChild as HTMLElement;
    const className = code.getAttribute("class") || "";
    const language = className.replace(/^language-/, "");
    return "\n```" + language + "\n" + code.textContent + "\n```\n";
  },
});

// 自定义规则：处理图片和图片说明
turndownService.addRule("images", {
  filter: "figure",
  replacement: (content, node) => {
    const img = node.querySelector("img");
    const figcaption = node.querySelector("figcaption");

    if (!img) return content;

    const alt = img.getAttribute("alt") || "";
    const src = img.getAttribute("src") || "";
    const caption = figcaption ? figcaption.textContent : "";

    return `![${alt}](${src})${caption ? "\n*" + caption + "*" : ""}`;
  },
});

self.addEventListener("message", (event) => {
  const { id, action, html } = event.data;

  if (action === "convert") {
    try {
      const markdown = turndownService.turndown(html);
      self.postMessage({ id, markdown });
    } catch (error: any) {
      // Send back message and stack trace
      self.postMessage({ id, error: { message: error.message, stack: error.stack } });
    }
  }
}); 