import fs from "node:fs/promises";
import Parser from "rss-parser";

const README_PATH = new URL("../README.md", import.meta.url);

// Substack 用 Cloudflare 风控，对默认/机器人 UA + 机房 IP 直接返回 403。
// 带上真实浏览器 UA，尽量让 GitHub Actions runner 通过。
const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept:
    "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8, */*;q=0.7",
};

const parser = new Parser({ headers: BROWSER_HEADERS });

const config = {
  readmePath: README_PATH,
  videoFeedUrl:
    process.env.YOUTUBE_FEED_URL ||
    "https://www.youtube.com/feeds/videos.xml?channel_id=UCSrk3Zvkt5pP2I04WfQVxsw",
  articleFeedUrl:
    process.env.ARTICLE_FEED_URL || "https://jemma747318.substack.com/feed",
  websiteUrl: process.env.WEBSITE_URL || "https://jiamanjemma.com",
  videoCount: Number(process.env.VIDEO_COUNT || 5),
  articleCount: Number(process.env.ARTICLE_COUNT || 5),
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildList(items, emptyLabel) {
  if (!items.length) return `- ${emptyLabel}`;

  return items
    .map((item) => {
      const date = formatDate(item.isoDate || item.pubDate);
      const suffix = date ? ` (${date})` : "";
      return `- [${item.title}](${item.link})${suffix}`;
    })
    .join("\n");
}

function replaceSection(markdown, start, end, content) {
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "m");
  return markdown.replace(pattern, `${start}\n${content}\n${end}`);
}

async function loadFeed(url) {
  const feed = await parser.parseURL(url);
  return feed.items || [];
}

// 主源：官网 jiamanjemma.com 的 /api/articles（Cloudflare Pages Function）。
// 它在 Cloudflare 边缘节点抓 Substack，边缘 IP 不被 403，返回干净 JSON：
//   [{ title, link, date: "2026.06.16", excerpt }]
// 自有域名 + 已带最新内容，最稳，永不被机房 IP 拦。
async function fetchApiArticles(url) {
  const base = url.replace(/\/+$/, "");
  const response = await fetch(`${base}/api/articles`, {
    headers: BROWSER_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item && item.title && item.link)
    .map((item) => ({
      title: item.title,
      link: item.link,
      // 日期是 2026.06.16，转成 ISO 让 formatDate 能识别。
      isoDate: typeof item.date === "string" ? item.date.replace(/\./g, "-") : "",
    }));
}

// Substack 取不到时的兜底：直接解析官网 jiamanjemma.com 的文章卡片。
// 卡片结构（按从新到旧排列）：
//   <a href="article.html?id=09" class="article-card">
//     ... <span class="article-date">2026.04.18</span> ...
//     <h3 class="article-title" ...>#09 问对问题：你不需要学会提问</h3>
async function fetchWebsiteArticles(url) {
  const base = url.replace(/\/+$/, "");
  const response = await fetch(base, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }
  const html = await response.text();

  const cardPattern =
    /<a[^>]+href="(article\.html\?id=[^"]+)"[^>]*class="article-card"[\s\S]*?class="article-date">([^<]+)<\/span>[\s\S]*?class="article-title"[^>]*>([\s\S]*?)<\/h3>/g;

  const uniqueItems = new Map();

  for (const match of html.matchAll(cardPattern)) {
    const link = `${base}/${match[1]}`;
    // 网站日期是 2026.04.18，转成 ISO 让 formatDate 能识别。
    const isoDate = match[2].trim().replace(/\./g, "-");
    const title = match[3]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || uniqueItems.has(link)) continue;
    uniqueItems.set(link, { title, link, isoDate });
  }

  return [...uniqueItems.values()];
}

async function safelyLoad(label, loader) {
  try {
    return await loader();
  } catch (error) {
    console.warn(`[warn] Failed to load ${label}: ${error.message}`);
    return [];
  }
}

async function main() {
  const [
    videoItems,
    apiArticleItems,
    articleFeedItems,
    websiteArticleItems,
    currentReadme,
  ] = await Promise.all([
    safelyLoad("video feed", () => loadFeed(config.videoFeedUrl)),
    safelyLoad("api articles", () => fetchApiArticles(config.websiteUrl)),
    safelyLoad("article feed", () => loadFeed(config.articleFeedUrl)),
    safelyLoad("website articles", () => fetchWebsiteArticles(config.websiteUrl)),
    fs.readFile(config.readmePath, "utf8"),
  ]);

  // 优先级：官网 /api/articles（最新+自有域名）> Substack feed 直取 > 官网文章卡片。
  const articleItems =
    apiArticleItems.length
      ? apiArticleItems
      : articleFeedItems.length
      ? articleFeedItems
      : websiteArticleItems;

  const latestVideos = buildList(
    videoItems.slice(0, config.videoCount),
    "暂时没有获取到视频"
  );
  const latestArticles = buildList(
    articleItems.slice(0, config.articleCount),
    "暂时没有获取到文章"
  );

  const nextReadme = replaceSection(
    replaceSection(
      currentReadme,
      "<!-- YOUTUBE:START -->",
      "<!-- YOUTUBE:END -->",
      latestVideos
    ),
    "<!-- BLOG-POST-LIST:START -->",
    "<!-- BLOG-POST-LIST:END -->",
    latestArticles
  );

  await fs.writeFile(config.readmePath, nextReadme);
  console.log("README updated successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
