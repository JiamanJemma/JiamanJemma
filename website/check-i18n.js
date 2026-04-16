const fs = require('fs');
const path = require('path');

const websiteDir = __dirname;
const i18nPath = path.join(websiteDir, 'i18n.js');
const localeNames = ['zh', 'en', 'zh-TW', 'ja'];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function getLocaleBlock(js, locale) {
  const escaped = locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const next = localeNames
    .filter((name) => name !== locale)
    .map((name) => `(?:'${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'|${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*:`)
    .join('|');
  const re = new RegExp(`(?:'${escaped}'|${escaped})\\s*:\\s*\\{([\\s\\S]*?)(?=\\n\\s*(?:${next})|\\n\\s*}\\s*;)`, 'm');
  const match = js.match(re);
  return match ? match[1] : '';
}

function collectHtmlFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(dir, name));
}

function hasLocalI18n(contents) {
  return /window\.__projectI18n|articleI18nDicts|var\s+dicts\s*=\s*\{/.test(contents);
}

function collectI18nKeys(contents) {
  return new Set([...contents.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)].map((m) => m[1]));
}

function collectLocaleKeys(block) {
  return new Set([...block.matchAll(/\n\s*([A-Za-z0-9_]+)\s*:/g)].map((m) => m[1]));
}

function findHardcodedLines(file, contents, usesLocalI18n) {
  const lines = contents.split('\n');
  const results = [];
  lines.forEach((line, index) => {
    if (usesLocalI18n && /<title>/.test(line)) {
      return;
    }
    if (/>[\u4e00-\u9fffぁ-んァ-ヶ][^<]*</.test(line) &&
        !/data-i18n=|data-i18n-placeholder=|<script|<!--|alt=|aria-label=|title=|href=|src=|type=/.test(line)) {
      results.push(`${path.basename(file)}:${index + 1}:${line.trim()}`);
    }
  });
  return results;
}

const htmlFiles = collectHtmlFiles(websiteDir);
const htmlFileData = htmlFiles.map((file) => {
  const contents = read(file);
  return { file, contents, usesLocalI18n: hasLocalI18n(contents) };
});
const htmlContents = htmlFileData
  .filter(({ usesLocalI18n }) => !usesLocalI18n)
  .map(({ contents }) => contents)
  .join('\n');
const requiredKeys = collectI18nKeys(htmlContents);
const js = read(i18nPath);

let failed = false;

localeNames.forEach((locale) => {
  const localeKeys = collectLocaleKeys(getLocaleBlock(js, locale));
  const missing = [...requiredKeys].filter((key) => !localeKeys.has(key)).sort();
  if (missing.length) {
    failed = true;
    console.log(`\n[missing] ${locale}: ${missing.length}`);
    missing.forEach((key) => console.log(`  - ${key}`));
  }
});

const localI18nFiles = htmlFileData
  .filter(({ usesLocalI18n }) => usesLocalI18n)
  .map(({ file }) => path.basename(file));

if (localI18nFiles.length) {
  console.log(`[i18n] Page-local dictionaries detected: ${localI18nFiles.join(', ')}`);
}

const hardcoded = htmlFileData.flatMap(({ file, contents, usesLocalI18n }) =>
  findHardcodedLines(file, contents, usesLocalI18n)
);
if (hardcoded.length) {
  console.log('\n[hardcoded text candidates]');
  hardcoded.forEach((line) => console.log(`  - ${line}`));
}

if (!failed) {
  console.log('[i18n] All locale keys present.');
}

process.exit(failed ? 1 : 0);
