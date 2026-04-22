import fs from "node:fs/promises";
import Parser from "rss-parser";

const README_PATH = new URL("../README.md", import.meta.url);
const parser = new Parser();

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

async function fetchWebsiteArticles(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "JiamanJemmaProfileBot/1.0",
    },
  });
  const html = await response.text();
  const matches = [
    ...html.matchAll(
      /<a[^>]+href="(https:\/\/jemma747318\.substack\.com\/p\/[^"]+)"[^>]*>(.*?)<\/a>/g
    ),
  ];

  const uniqueItems = new Map();

  for (const match of matches) {
    const link = match[1];
    const title = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || uniqueItems.has(link)) continue;
    uniqueItems.set(link, { title, link });
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
  const [videoItems, articleFeedItems, websiteArticleItems, currentReadme] =
    await Promise.all([
      safelyLoad("video feed", () => loadFeed(config.videoFeedUrl)),
      safelyLoad("article feed", () => loadFeed(config.articleFeedUrl)),
      safelyLoad("website articles", () => fetchWebsiteArticles(config.websiteUrl)),
      fs.readFile(config.readmePath, "utf8"),
    ]);

  const articleItems = articleFeedItems.length
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
