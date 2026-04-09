/**
 * Substack 文章自动同步模块
 * 从自建 API（/api/articles）拉取最新文章，动态渲染到文章区
 * 降级：API → 静态卡片（已有 HTML fallback）
 */
(function () {
  'use strict';

  var MAX_ARTICLES = 8;

  // 已知文章的 i18n key 映射（按 Substack URL 路径）
  // 新的 #XX 文章自动用 article_XX_title/excerpt
  var LEGACY_I18N = {
    '/p/why-i-quit-automation-for-ai-skills': { t: 'article_03_title', e: 'article_03_excerpt', cat: 'vibecoding' },
    '/p/01': { t: 'article_0_title', e: 'article_0_excerpt', cat: 'vibecoding' },
    '/p/fe1': { t: 'article_1_title', e: 'article_1_excerpt', cat: 'philosophy' },
    '/p/fate-is-not-written-in-the-stars': { t: 'article_2_title', e: 'article_2_excerpt', cat: 'fate' },
    '/p/a-new-beginning': { t: 'article_3_title', e: 'article_3_excerpt', cat: 'journal' }
  };

  var CAT_LABELS = {
    vibecoding: 'Vibe Coding',
    philosophy: '哲思',
    fate: '命运',
    journal: '日志'
  };

  function escapeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getSlug(link) {
    try { return new URL(link).pathname; } catch (_) { return ''; }
  }

  function getI18nKeys(article) {
    var slug = getSlug(article.link);

    // Legacy mapping
    if (LEGACY_I18N[slug]) {
      return { t: LEGACY_I18N[slug].t, e: LEGACY_I18N[slug].e };
    }

    // Auto-detect #XX numbered articles
    var m = article.title.match(/^#(\d+)/);
    if (m) {
      var n = m[1].padStart(2, '0');
      return { t: 'article_' + n + '_title', e: 'article_' + n + '_excerpt' };
    }

    return null;
  }

  function getCategory(article) {
    var slug = getSlug(article.link);
    if (LEGACY_I18N[slug]) return LEGACY_I18N[slug].cat;
    if (/^#\d+/.test(article.title)) return 'vibecoding';
    if (/Fate|fate|命运/.test(article.title)) return 'fate';
    if (/Beginning|beginning|日志|日记/.test(article.title)) return 'journal';
    if (/哲学|构建者|Philosophy/.test(article.title)) return 'philosophy';
    return 'vibecoding';
  }

  // Map for articles that have local .md files in articles/ directory
  var LOCAL_ARTICLE_MAP = {
    '01': true, '02': true, '03': true, '04': true, '05': true, '06': true,
    '07': true, '08': true, '09': true
  };

  // Legacy slug → local id mapping
  var LEGACY_LOCAL_MAP = {
    '/p/why-i-quit-automation-for-ai-skills': '03',
    '/p/01': '01',
    '/p/fe1': 'fe1',
    '/p/fate-is-not-written-in-the-stars': 'fate',
    '/p/a-new-beginning': 'beginning'
  };

  function getLocalLink(article) {
    // Check #XX numbered articles
    var m = article.title.match(/^#(\d+)/);
    if (m) {
      var n = m[1].padStart(2, '0');
      if (LOCAL_ARTICLE_MAP[n]) {
        return 'article.html?id=' + n;
      }
    }
    // Check legacy articles
    var slug = getSlug(article.link);
    if (LEGACY_LOCAL_MAP[slug]) {
      return 'article.html?id=' + LEGACY_LOCAL_MAP[slug];
    }
    return null;
  }

  function renderArticles(articles) {
    var container = document.querySelector('#articles .articles-grid');
    if (!container || !articles.length) return;

    // 【核心修复】：保留在 HTML 里且比 Substack 还新的本地「偷跑首发」卡片
    var preExistingNewCardsHTML = '';
    var latestSubstackNum = 0;
    
    // 找出 Substack 最新文章的编号，借此判断本地有没有更超前的
    var mLatest = articles[0].title.match(/^#(\d+)/);
    if (mLatest) latestSubstackNum = parseInt(mLatest[1], 10);

    // 遍历原本硬编码的卡片
    Array.from(container.querySelectorAll('.article-card')).forEach(function(card) {
      var href = card.getAttribute('href');
      var mHref = href && href.match(/id=(\d+)/);
      if (mHref) {
        var localNum = parseInt(mHref[1], 10);
        // 如果本地硬编码卡片的期数，大于 Substack 所拉取到的最新期数，说明这是一篇未来的首发稿！不能删掉，提取保存
        if (localNum > latestSubstackNum) {
          preExistingNewCardsHTML += card.outerHTML;
        }
      }
    });

    var newHtml = articles.map(function (a) {
      var keys = getI18nKeys(a);
      var cat = getCategory(a);
      var catKey = 'cat_' + cat;
      var catLabel = CAT_LABELS[cat] || cat;

      var titleAttr = keys ? ' data-i18n="' + keys.t + '"' : '';
      var excerptAttr = keys ? ' data-i18n="' + keys.e + '"' : '';

      // Use local article reader if .md file exists, otherwise external link
      var localLink = getLocalLink(a);
      var linkHref = localLink || escapeHTML(a.link);
      var linkTarget = localLink ? '' : ' target="_blank" rel="noopener noreferrer"';

      return '<a href="' + linkHref + '"' + linkTarget + ' class="article-card">' +
        '<div class="article-meta">' +
        '<span class="article-category" data-i18n="' + catKey + '">' + escapeHTML(catLabel) + '</span>' +
        '<span class="article-date">' + escapeHTML(a.date) + '</span>' +
        '</div>' +
        '<h3 class="article-title"' + titleAttr + '>' + escapeHTML(a.title) + '</h3>' +
        '<p class="article-excerpt"' + excerptAttr + '>' + escapeHTML(a.excerpt) + '</p>' +
        '<span class="article-link" data-i18n="read_more">阅读更多 &rarr;</span>' +
        '</a>';
    }).join('');

    // 把本地被 Substack 定时卡住的“偷跑”卡片，强行塞在队列最前面！出炉！
    container.innerHTML = preExistingNewCardsHTML + newHtml;

    // Re-apply i18n after DOM update
    requestAnimationFrame(function () {
      if (window.i18n) {
        window.i18n.apply(window.i18n.get());
      }
    });

    // Trigger intersection observer if available
    if (typeof window.observeNewCards === 'function') {
      window.observeNewCards();
    }
  }

  function init() {
    fetch('/api/articles')
      .then(function (r) {
        if (!r.ok) throw new Error('API failed: ' + r.status);
        return r.json();
      })
      .then(function (articles) {
        if (!articles.length) throw new Error('No articles');
        renderArticles(articles.slice(0, MAX_ARTICLES));
      })
      .catch(function (err) {
        // API failed — keep static HTML as fallback
        console.warn('Substack sync failed, using static fallback:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
