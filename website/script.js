/**
 * UI 交互模块
 * 主题切换 · 语言切换 · 移动菜单 · 平滑滚动 · 导航阴影 · 滚动动画
 */
(function () {
  'use strict';

  // ================================
  // 1. 主题切换（跟随系统 + 手动切换）
  // ================================
  var html = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');

  // 获取系统主题偏好
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function getSavedTheme() {
    return localStorage.getItem('theme') || getSystemTheme();
  }

  // 应用主题
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  // 初始化：应用已保存的或系统主题
  applyTheme(getSavedTheme());

  // 手动切换
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = html.getAttribute('data-theme');
      var next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  }

  // ================================
  // 2. 语言切换器
  // ================================
  var langBtn = document.getElementById('langBtn');
  var langDropdown = document.getElementById('langDropdown');

  // 点击地球图标，打开/关闭下拉菜单
  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      langDropdown.classList.toggle('active');
    });

    // 点击语言选项
    langDropdown.querySelectorAll('.lang-option').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var lang = this.getAttribute('data-lang');
        document.body.classList.remove('menu-open', 'modal-open');
        document.body.style.overflow = '';
        activeModal = null;
        if (lang && window.i18n) {
          window.i18n.apply(lang);
        }
        langDropdown.classList.remove('active');
      });
    });

    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', function () {
      langDropdown.classList.remove('active');
    });
  }

  // ================================
  // 3. 移动端菜单
  // ================================
  var menuToggle = document.getElementById('menuToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  var mobileMenuClose = document.getElementById('mobileMenuClose');
  var mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  var searchModal = document.getElementById('searchModal');
  var searchTrigger = document.getElementById('searchTrigger');
  var searchModalClose = document.getElementById('searchModalClose');
  var siteSearchInput = document.getElementById('siteSearchInput');
  var searchResults = document.getElementById('searchResults');
  var activeModal = null;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function getScrollBehavior() {
    return prefersReducedMotion.matches ? 'auto' : 'smooth';
  }

  function prefersPointerMotion() {
    return !prefersReducedMotion.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function updateBodyLock() {
    var shouldLock = !!(
      (mobileMenu && mobileMenu.classList.contains('active')) ||
      activeModal
    );
    document.body.style.overflow = shouldLock ? 'hidden' : '';
  }

  function openMenu() {
    if (mobileMenu) mobileMenu.classList.add('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active');
    document.body.classList.add('menu-open');
    updateBodyLock();
  }

  function closeMenu() {
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    document.body.classList.remove('menu-open');
    updateBodyLock();
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    if (modal === searchModal) {
      modal.setAttribute('aria-hidden', 'false');
    }
    activeModal = modal;
    document.body.classList.add('modal-open');
    updateBodyLock();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    if (modal === searchModal) {
      modal.setAttribute('aria-hidden', 'true');
    }
    if (activeModal === modal) {
      activeModal = null;
    }
    if (!activeModal) {
      document.body.classList.remove('modal-open');
    }
    updateBodyLock();
  }

  if (menuToggle) menuToggle.addEventListener('click', openMenu);
  if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMenu);
  if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', closeMenu);

  function showHome() {
    allPaperLinks.forEach(function (paperLink) {
      paperLink.classList.remove('expanded');
    });
    allSections.forEach(function (section) {
      section.classList.remove('expanded', 'fading-out');
    });
    currentSection = null;
    currentPaper = null;

    if (hero) {
      hero.classList.remove('hidden', 'fading');
    }
    if (globalSocialBar) globalSocialBar.style.display = 'none';
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  }

  // 点击菜单链接后切换页面并关闭菜单
  document.querySelectorAll('.mobile-menu-link').forEach(function (link) {
    link.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      // Allow external links (non-anchor) to navigate normally
      if (targetId && !targetId.startsWith('#')) {
        closeMenu();
        return; // let browser handle the navigation
      }
      e.preventDefault();
      closeMenu();

      // 首页链接
      if (targetId === '#home') {
        navigateToRoute('#home');
        return;
      }

      var target = document.querySelector(targetId);
      if (!target) return;
      navigateToRoute(targetId);
    });
  });

  // ================================
  // 4. 平滑滚动（锚点链接）
  // ================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      if (
        anchor.classList.contains('paper-link') ||
        anchor.classList.contains('hero-action') ||
        anchor.classList.contains('hero-quick-link') ||
        anchor.classList.contains('mobile-menu-link')
      ) {
        return;
      }
      var href = this.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var top = target.offsetTop - 70;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // ================================
  // 5. 导航栏滚动阴影
  // ================================
  var nav = document.querySelector('.nav');

  window.addEventListener('scroll', function () {
    if (!nav) return;
    if (window.pageYOffset > 10) {
      nav.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    } else {
      nav.style.boxShadow = 'none';
    }
  });

  // ================================
  // 6. Intersection Observer 滚动动画（带交错延迟）
  // ================================
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  function prepareCard(card, index) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px)';
    card.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    card.style.transitionDelay = (index * 0.1) + 's';
    observer.observe(card);
  }

  // 初始卡片
  function observeAllCards() {
    var cards = document.querySelectorAll('.project-card, .video-card, .article-card');
    if (prefersReducedMotion.matches) {
      cards.forEach(function (card) {
        card.style.opacity = '1';
        card.style.transform = 'none';
        card.style.transition = 'none';
      });
      return;
    }
    cards.forEach(function (card, i) {
      // 跳过已经处理过的
      if (card.dataset.observed) return;
      card.dataset.observed = 'true';
      prepareCard(card, i);
    });
  }

  // 暴露给 youtube.js 调用（动态加载视频卡片后触发）
  window.observeNewCards = observeAllCards;

  // 首次执行
  observeAllCards();

  console.log('✨ 佳蔓 Jemma 的个人网站已加载');

  // ================================
  // 视频号二维码弹窗
  // ================================
  var channelsQrBtn = document.getElementById('channelsQrBtn');
  var channelsQrModal = document.getElementById('channelsQrModal');
  var channelsQrClose = document.getElementById('channelsQrClose');

  if (channelsQrBtn && channelsQrModal && channelsQrClose) {
    channelsQrBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openModal(channelsQrModal);
    });

    channelsQrClose.addEventListener('click', function() {
      closeModal(channelsQrModal);
    });

    channelsQrModal.addEventListener('click', function(e) {
      if (e.target === channelsQrModal) {
        closeModal(channelsQrModal);
      }
    });
  }

  // ================================
  // 紫甲小程序预览弹窗
  // ================================
  var ZIJIA_MINI_PROGRAM_URL = '小程序://紫甲/r25pzPzMjllvKaw';
  var zijiaCard = document.getElementById('zijiaCard');
  var zijiaModal = document.getElementById('zijiaModal');
  var zijiaModalClose = document.getElementById('zijiaModalClose');
  var zijiaLaunchBtn = document.getElementById('zijiaLaunchBtn');

  function openZijiaMiniProgram() {
    window.location.href = ZIJIA_MINI_PROGRAM_URL;
  }

  if (zijiaCard && zijiaModal && zijiaModalClose) {
    zijiaCard.addEventListener('click', function(e) {
      e.preventDefault();
      openModal(zijiaModal);
    });

    zijiaModalClose.addEventListener('click', function() {
      closeModal(zijiaModal);
    });

    zijiaModal.addEventListener('click', function(e) {
      if (e.target === zijiaModal) {
        closeModal(zijiaModal);
      }
    });
  }

  if (zijiaLaunchBtn) {
    zijiaLaunchBtn.addEventListener('click', function () {
      openZijiaMiniProgram();
    });
  }

  // ================================
  // 7. 单页应用 + 3D纸团展开动画
  // ================================
  var allSections = document.querySelectorAll('.section');
  var allPaperLinks = document.querySelectorAll('.paper-link');
  var hero = document.querySelector('.hero');
  var globalSocialBar = document.querySelector('.global-social-bar');
  var currentSection = null;
  var currentPaper = null;
  var isRouting = false;

  function getRouteTarget(route) {
    if (!route || route === '#' || route === '#home') return '#home';
    return route.charAt(0) === '#' ? route : ('#' + route.replace(/^#/, ''));
  }

  function navigateToRoute(route) {
    var normalizedRoute = getRouteTarget(route);
    if (window.location.hash !== normalizedRoute) {
      isRouting = true;
      window.location.hash = normalizedRoute;
      return;
    }
    renderRoute(normalizedRoute);
  }

  function renderRoute(route) {
    var normalizedRoute = getRouteTarget(route);
    if (normalizedRoute === '#home') {
      showHome();
      return;
    }
    if (!openSectionById(normalizedRoute)) {
      if (window.location.hash && window.location.hash !== '#home') {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#home');
      }
      showHome();
    }
  }

  function openSectionById(targetId) {
    var target = document.querySelector(targetId);
    var matchingPaper = document.querySelector('.paper-link[href="' + targetId + '"]');
    if (!target || !matchingPaper) {
      return false;
    }

    if (currentPaper && currentPaper !== matchingPaper) {
      currentPaper.classList.remove('expanded');
    }

    var oldSection = currentSection;
    var transitionDelay = 0;

    if (oldSection && oldSection !== target) {
      oldSection.classList.add('fading-out');
      transitionDelay = 250;
    } else if (!hero || !hero.classList.contains('hidden')) {
      if (hero) hero.classList.add('fading');
      transitionDelay = 300;
    }

    setTimeout(function() {
      if (oldSection) {
        oldSection.classList.remove('expanded', 'fading-out');
      }
      allSections.forEach(function(s) {
        s.classList.remove('expanded', 'fading-out');
      });

      if (hero) {
        hero.classList.add('hidden');
        hero.classList.remove('fading');
      }
      if (globalSocialBar) globalSocialBar.style.display = '';

      matchingPaper.classList.add('expanded');
      currentPaper = matchingPaper;

      target.classList.add('expanded');
      target.classList.add('section-arriving');
      currentSection = target;
      setTimeout(function () {
        target.classList.remove('section-arriving');
      }, 720);

      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    }, transitionDelay);

    return true;
  }

  // 首页时隐藏底部社交栏
  if (globalSocialBar) globalSocialBar.style.display = 'none';

  allPaperLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      var self = this;
      var targetId = self.getAttribute('href');

      // Allow external links (non-anchor) to navigate normally
      if (targetId && !targetId.startsWith('#')) return;

      e.preventDefault();
      var target = document.querySelector(targetId);

      if (!target) return;

      // 如果点击的是当前展开的纸片，返回首页
      if (currentPaper === self && self.classList.contains('expanded')) {
        self.classList.remove('expanded');

        // 淡出 section，再显示首页
        target.classList.add('fading-out');
        setTimeout(function() {
          target.classList.remove('expanded', 'fading-out');
          currentSection = null;
          currentPaper = null;

          if (hero) {
            hero.classList.remove('hidden');
            hero.classList.add('fading');
            void hero.offsetWidth;
            hero.classList.remove('fading');
          }
          if (globalSocialBar) globalSocialBar.style.display = 'none';
          window.scrollTo({ top: 0 });
        }, 250);
        return;
      }

      navigateToRoute(targetId);
    });
  });

  document.querySelectorAll('.hero-action, .hero-quick-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) return;
      e.preventDefault();
      navigateToRoute(targetId);
    });
  });

  // Logo 点击返回首页
  var logo = document.querySelector('.paper-logo');
  if (logo) {
    logo.addEventListener('click', function(e) {
      e.preventDefault();
      allPaperLinks.forEach(function(link) {
        if (!link.classList.contains('expanded')) return;
        link.classList.remove('expanded');
        link.classList.add('folding');
        setTimeout(function() {
          link.classList.remove('folding');
        }, 600);
      });
      navigateToRoute('#home');
    });
  }

  window.addEventListener('hashchange', function () {
    if (isRouting) {
      isRouting = false;
    }
    renderRoute(window.location.hash);
  });

  renderRoute(window.location.hash || '#home');

  console.log('单页应用模式已启用');

  // ================================
  // 8. 资源卡片展开/收起
  // ================================
  var expandableCards = document.querySelectorAll('.resource-card.expandable');

  function getI18nText(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key);
    }
    return fallback;
  }

  function updateResourceToggle(toggle, expanded) {
    if (!toggle) return;
    toggle.textContent = expanded ? getI18nText('collapse', '收起') : getI18nText('expand', '展开');
  }

  expandableCards.forEach(function(card) {
    var header = card.querySelector('.resource-header');
    var toggle = card.querySelector('.resource-toggle');

    updateResourceToggle(toggle, card.classList.contains('expanded'));

    if (header) {
      header.addEventListener('click', function(e) {
        // 如果点击的是链接，不触发展开
        if (e.target.closest('.tool-link')) return;

        var isExpanded = card.classList.contains('expanded');

        // 收起其他卡片
        expandableCards.forEach(function(c) {
          if (c !== card) {
            c.classList.remove('expanded');
            var t = c.querySelector('.resource-toggle');
            updateResourceToggle(t, false);
          }
        });

        // 切换当前卡片
        card.classList.toggle('expanded');
        updateResourceToggle(toggle, card.classList.contains('expanded'));
      });
    }
  });

  document.addEventListener('i18n:changed', function () {
    expandableCards.forEach(function (card) {
      updateResourceToggle(card.querySelector('.resource-toggle'), card.classList.contains('expanded'));
    });
  });

  var projectCategoryGroups = document.querySelectorAll('.project-category-group');
  projectCategoryGroups.forEach(function (group) {
    group.addEventListener('toggle', function () {
      if (!group.open) return;
      projectCategoryGroups.forEach(function (other) {
        if (other !== group) {
          other.open = false;
        }
      });
    });
  });

  // ================================
  // 9. 全站快速搜索
  // ================================
  var searchIndex = [];
  var renderedSearchResults = [];
  var activeSearchResultIndex = -1;
  var searchUid = 0;
  var recentSearchStorageKey = 'jemma.search.recent';
  var searchFilters = document.getElementById('searchFilters');
  var currentSearchFilter = 'all';

  function ensureSearchId(el, prefix) {
    if (!el) return '';
    if (!el.dataset.searchId) {
      searchUid += 1;
      el.dataset.searchId = prefix + '-' + searchUid;
    }
    return el.dataset.searchId;
  }

  function truncateText(text, max) {
    var clean = (text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1) + '…';
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightQuery(text, query) {
    var safeText = escapeHtml(text);
    var q = (query || '').trim();
    if (!q) return safeText;
    var pattern = new RegExp('(' + escapeRegExp(q) + ')', 'ig');
    return safeText.replace(pattern, '<mark class="search-highlight">$1</mark>');
  }

  function getSearchTypeLabel(type) {
    var keyMap = {
      section: 'search_type_section',
      article: 'search_type_article',
      project: 'search_type_project',
      resource: 'search_type_resource',
      video: 'search_type_video',
      contact: 'search_type_contact',
      community: 'search_type_community'
    };
    return getI18nText(keyMap[type] || keyMap.section, type);
  }

  function getSearchBadgeLabel(item) {
    if (!item) return '';
    if (item.type === 'project' && item.subtype) {
      return item.subtype;
    }
    if (item.type === 'resource' && item.subtype) {
      return item.subtype;
    }
    if (currentSearchFilter !== 'all' && item.type === currentSearchFilter) {
      return '';
    }
    return getSearchTypeLabel(item.type);
  }

  function getEffectiveFilterTypes(filter) {
    if (!filter || filter === 'all') return null;
    return [filter];
  }

  function matchesSearchFilter(item, filter) {
    var allowedTypes = getEffectiveFilterTypes(filter);
    if (!allowedTypes) return true;
    return allowedTypes.indexOf(item.type) !== -1;
  }

  function updateSearchFilterUI() {
    if (!searchFilters) return;
    searchFilters.querySelectorAll('.search-filter-chip').forEach(function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-search-filter') === currentSearchFilter);
    });
  }

  function buildSearchIndex() {
    searchIndex = [];

    [
      { selector: '#articles', type: 'section', title: getI18nText('nav_articles', '文章'), desc: getI18nText('articles_title', '文章 & 思考') },
      { selector: '#projects', type: 'section', title: getI18nText('nav_projects', '作品'), desc: getI18nText('projects_title', '作品 & 项目') },
      { selector: '#resources', type: 'section', title: getI18nText('nav_resources', '资源'), desc: getI18nText('resources_title', '资源下载') },
      { selector: '#videos', type: 'section', title: getI18nText('nav_videos', '视频'), desc: getI18nText('videos_title', '最新视频') },
      { selector: '#podcast', type: 'section', title: getI18nText('nav_podcast', '播客'), desc: getI18nText('podcast_title', '播客') },
      { selector: '#community', type: 'community', title: getI18nText('nav_community', '社区'), desc: getI18nText('community_title', '加入社区') },
      { selector: '#contact', type: 'contact', title: getI18nText('nav_contact', '联系'), desc: getI18nText('contact_title', '联系我') }
    ].forEach(function (item) {
      searchIndex.push({
        type: item.type,
        title: item.title,
        desc: item.desc,
        keywords: (item.title + ' ' + item.desc).toLowerCase(),
        route: item.selector
      });
    });

    document.querySelectorAll('.article-card').forEach(function (card) {
      var title = (card.querySelector('.article-title') || {}).textContent || '';
      var desc = (card.querySelector('.article-excerpt') || {}).textContent || '';
      searchIndex.push({
        type: 'article',
        title: title.trim(),
        desc: truncateText(desc, 96),
        keywords: (card.textContent || '').toLowerCase(),
        href: card.getAttribute('href')
      });
    });

    document.querySelectorAll('.project-entry').forEach(function (entry) {
      var category = entry.closest('.project-category-group');
      var categoryTitle = category && category.querySelector('.project-category-title')
        ? category.querySelector('.project-category-title').textContent.trim()
        : '';
      var title = (entry.querySelector('.project-name') || {}).textContent || '';
      var desc = (entry.querySelector('.project-entry-excerpt') || {}).textContent || '';
      searchIndex.push({
        type: 'project',
        subtype: categoryTitle,
        title: title.trim(),
        desc: truncateText(desc, 96),
        keywords: (entry.textContent || '').toLowerCase(),
        route: '#projects',
        categoryId: ensureSearchId(category, 'project-category'),
        entryId: ensureSearchId(entry, 'project-entry')
      });
    });

    document.querySelectorAll('#resources .resource-card').forEach(function (card) {
      var resourceTitle = (card.querySelector('.resource-name') || {}).textContent || '';
      var resourceDesc = (card.querySelector('.resource-desc') || {}).textContent || '';
      var cardId = ensureSearchId(card, 'resource-card');
      searchIndex.push({
        type: 'resource',
        subtype: resourceTitle.trim(),
        title: resourceTitle.trim(),
        desc: truncateText(resourceDesc, 96),
        keywords: (card.textContent || '').toLowerCase(),
        route: '#resources',
        resourceCardId: cardId
      });

      card.querySelectorAll('.tool-item').forEach(function (toolItem) {
        var toolName = (toolItem.querySelector('.tool-name') || {}).textContent || '';
        if (!toolName.trim()) return;
        searchIndex.push({
          type: 'resource',
          subtype: resourceTitle.trim(),
          title: toolName.trim(),
          desc: truncateText(resourceTitle + ' · ' + resourceDesc, 96),
          keywords: (toolItem.textContent + ' ' + resourceTitle + ' ' + resourceDesc).toLowerCase(),
          route: '#resources',
          resourceCardId: cardId,
          toolId: ensureSearchId(toolItem, 'tool-item')
        });
      });
    });

    var latestVideoCard = document.getElementById('latest-video-card');
    if (latestVideoCard) {
      var latestVideoTitle = latestVideoCard.textContent.replace(/\s+/g, ' ').trim();
      searchIndex.push({
        type: 'video',
        title: latestVideoTitle || getI18nText('latest_video', '最新视频'),
        desc: getI18nText('videos_copy', '记录我正在实践的 AI 工作流、创作方法，以及从想法到落地的真实过程。'),
        keywords: (latestVideoTitle + ' ' + latestVideoCard.getAttribute('href')).toLowerCase(),
        href: latestVideoCard.getAttribute('href')
      });
    }

    document.querySelectorAll('.community-card').forEach(function (card) {
      searchIndex.push({
        type: 'community',
        title: truncateText(card.querySelector('h3') ? card.querySelector('h3').textContent : getI18nText('community_title', '加入社区'), 60),
        desc: truncateText(card.textContent, 96),
        keywords: (card.textContent || '').toLowerCase(),
        route: '#community'
      });
    });

    document.querySelectorAll('.contact-card').forEach(function (card) {
      searchIndex.push({
        type: 'contact',
        title: truncateText(card.textContent, 60),
        desc: getI18nText('contact_title', '联系我'),
        keywords: (card.textContent || '').toLowerCase(),
        route: '#contact'
      });
    });
  }

  function getSearchMatches(query) {
    var q = (query || '').toLowerCase().trim();
    if (!q) return [];

    return searchIndex
      .filter(function (item) {
        return matchesSearchFilter(item, currentSearchFilter);
      })
      .map(function (item) {
        var title = (item.title || '').toLowerCase();
        var desc = (item.desc || '').toLowerCase();
        var score = 0;
        if (title === q) score += 120;
        if (title.indexOf(q) === 0) score += 80;
        if (title.indexOf(q) !== -1) score += 50;
        if (desc.indexOf(q) !== -1) score += 20;
        if (item.keywords.indexOf(q) !== -1) score += 10;
        if (item.type === 'section') score -= 15;
        return { item: item, score: score };
      })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (entry) { return entry.item; })
      .slice(0, 10);
  }

  function getStoredRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(recentSearchStorageKey) || '[]');
    } catch (err) {
      return [];
    }
  }

  function saveRecentSearch(item) {
    if (!item || !item.title) return;
    var recent = getStoredRecentSearches().filter(function (entry) {
      return !(entry.title === item.title && entry.type === item.type);
    });
    recent.unshift({
      title: item.title,
      type: item.type,
      desc: item.desc,
      route: item.route || '',
      href: item.href || '',
      categoryId: item.categoryId || '',
      entryId: item.entryId || '',
      resourceCardId: item.resourceCardId || '',
      toolId: item.toolId || ''
    });
    localStorage.setItem(recentSearchStorageKey, JSON.stringify(recent.slice(0, 4)));
  }

  function getDefaultSearchResults() {
    var recent = getStoredRecentSearches();
    var recentKeyMap = {};
    var recommended = [];
    var curatedByFilter = [];

    recent = recent.filter(function (item) {
      return matchesSearchFilter(item, currentSearchFilter);
    });

    recent.forEach(function (item) {
      recentKeyMap[item.type + '|' + item.title] = true;
    });

    [
      '#articles',
      '#projects',
      '#resources',
      '#videos'
    ].forEach(function (route) {
      var match = searchIndex.find(function (item) {
        return item.route === route && item.type === 'section' && matchesSearchFilter(item, currentSearchFilter);
      });
      if (match && !recentKeyMap[match.type + '|' + match.title]) {
        recommended.push(match);
      }
    });

    if (currentSearchFilter !== 'all') {
      if (currentSearchFilter === 'resource') {
        curatedByFilter = searchIndex.filter(function (item) {
          return item.type === 'resource' && !item.toolId;
        }).slice(0, 8);
      } else if (currentSearchFilter === 'project') {
        var seenProjectSubtype = {};
        curatedByFilter = searchIndex.filter(function (item) {
          if (item.type !== 'project') return false;
          if (!item.subtype) return true;
          if (seenProjectSubtype[item.subtype]) return false;
          seenProjectSubtype[item.subtype] = true;
          return true;
        }).slice(0, 6);
      } else {
        curatedByFilter = searchIndex.filter(function (item) {
          return item.type === currentSearchFilter;
        }).slice(0, 6);
      }
    }

    return {
      recent: recent,
      recommended: currentSearchFilter === 'all' ? recommended.slice(0, 4) : curatedByFilter
    };
  }

  function setActiveSearchResult(nextIndex) {
    var items = searchResults ? searchResults.querySelectorAll('.search-result-item') : [];
    if (!items.length) {
      activeSearchResultIndex = -1;
      return;
    }
    activeSearchResultIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
    items.forEach(function (item, index) {
      item.classList.toggle('is-active', index === activeSearchResultIndex);
    });
    if (items[activeSearchResultIndex]) {
      items[activeSearchResultIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderSearchResults(query) {
    if (!searchResults) return;

    var q = (query || '').trim();

    if (!q) {
      var defaults = getDefaultSearchResults();
      renderedSearchResults = defaults.recent.concat(defaults.recommended);

      if (!renderedSearchResults.length) {
        activeSearchResultIndex = -1;
        searchResults.innerHTML = '<div class="search-result-empty">' + getI18nText('quick_search_empty', '没有找到相关结果') + '</div>';
        return;
      }

      var offset = 0;
      var sections = [];
      if (defaults.recent.length) {
        sections.push(
          '<div class="search-result-group">' +
            '<div class="search-result-group-title">' + getI18nText('quick_search_recent', '最近查看') + '</div>' +
            '<div class="search-result-list">' + defaults.recent.map(function (item, index) {
              return renderSearchResultItem(item, index, '');
            }).join('') + '</div>' +
          '</div>'
        );
        offset = defaults.recent.length;
      }
      if (defaults.recommended.length) {
        sections.push(
          '<div class="search-result-group">' +
            '<div class="search-result-group-title">' + getI18nText('quick_search_recommended', '推荐入口') + '</div>' +
            '<div class="search-result-list">' + defaults.recommended.map(function (item, index) {
              return renderSearchResultItem(item, index + offset, '');
            }).join('') + '</div>' +
          '</div>'
        );
      }
      searchResults.innerHTML = sections.join('');
      activeSearchResultIndex = 0;
      return;
    }

    renderedSearchResults = getSearchMatches(q);

    if (!renderedSearchResults.length) {
      activeSearchResultIndex = -1;
      searchResults.innerHTML = '<div class="search-result-empty">' + getI18nText('quick_search_empty', '没有找到相关结果') + '</div>';
      return;
    }

    searchResults.innerHTML = '<div class="search-result-list">' + renderedSearchResults.map(function (item, index) {
      return renderSearchResultItem(item, index, q);
    }).join('') + '</div>';

    activeSearchResultIndex = 0;
  }

  function renderSearchResultItem(item, index, query) {
    var badgeLabel = getSearchBadgeLabel(item);
    return (
      '<button type="button" class="search-result-item' + (index === 0 ? ' is-active' : '') + (badgeLabel ? '' : ' search-result-item-no-badge') + '" data-search-index="' + index + '" data-cursor-label="Open">' +
        (badgeLabel ? '<span class="search-result-type">' + escapeHtml(badgeLabel) + '</span>' : '') +
        '<span class="search-result-main">' +
          '<span class="search-result-title">' + highlightQuery(item.title, query) + '</span>' +
          '<span class="search-result-desc">' + highlightQuery(item.desc, query) + '</span>' +
        '</span>' +
        '<span class="search-result-arrow">↗</span>' +
      '</button>'
    );
  }

  function resetSearchState() {
    renderedSearchResults = [];
    activeSearchResultIndex = -1;
    if (siteSearchInput) siteSearchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
  }

  function openSearchModal() {
    if (!searchModal) return;
    openModal(searchModal);
    currentSearchFilter = 'all';
    buildSearchIndex();
    updateSearchFilterUI();
    renderSearchResults('');
    window.setTimeout(function () {
      if (siteSearchInput) siteSearchInput.focus();
    }, 30);
  }

  function closeSearchModal() {
    if (!searchModal) return;
    closeModal(searchModal);
    resetSearchState();
  }

  function revealSearchTarget(item) {
    if (!item) return;

    if (item.href && !item.route) {
      window.location.href = item.href;
      return;
    }

    if (item.route) {
      navigateToRoute(item.route);
    }

    window.setTimeout(function () {
      if (item.categoryId) {
        var category = document.querySelector('[data-search-id="' + item.categoryId + '"]');
        if (category) category.open = true;
      }

      if (item.entryId) {
        var entry = document.querySelector('[data-search-id="' + item.entryId + '"]');
        if (entry) {
          entry.open = true;
          entry.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
        }
      }

      if (item.resourceCardId) {
        var card = document.querySelector('[data-search-id="' + item.resourceCardId + '"]');
        if (card) {
          expandableCards.forEach(function (other) {
            if (other !== card) {
              other.classList.remove('expanded');
              updateResourceToggle(other.querySelector('.resource-toggle'), false);
            }
          });
          card.classList.add('expanded');
          updateResourceToggle(card.querySelector('.resource-toggle'), true);
          if (item.toolId) {
            var tool = document.querySelector('[data-search-id="' + item.toolId + '"]');
            if (tool) {
              tool.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
              return;
            }
          }
          card.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
        }
      }

      if (item.route && !item.entryId && !item.resourceCardId) {
        var target = document.querySelector(item.route);
        if (target) {
          target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
        }
      }

      if (item.href && item.route === '#videos') {
        window.open(item.href, '_blank', 'noopener');
      }
    }, 360);
  }

  if (searchTrigger) {
    searchTrigger.addEventListener('click', function () {
      openSearchModal();
    });
  }

  if (searchModalClose) {
    searchModalClose.addEventListener('click', function () {
      closeSearchModal();
    });
  }

  if (searchFilters) {
    searchFilters.addEventListener('click', function (e) {
      var chip = e.target.closest('.search-filter-chip');
      if (!chip) return;
      currentSearchFilter = chip.getAttribute('data-search-filter') || 'all';
      updateSearchFilterUI();
      renderSearchResults(siteSearchInput ? siteSearchInput.value : '');
    });
  }

  if (searchModal) {
    searchModal.addEventListener('click', function (e) {
      if (e.target === searchModal) {
        closeSearchModal();
      }
    });
  }

  if (siteSearchInput) {
    siteSearchInput.addEventListener('input', function () {
      renderSearchResults(siteSearchInput.value);
    });

    siteSearchInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSearchResult(activeSearchResultIndex + 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSearchResult(activeSearchResultIndex - 1);
        return;
      }
      if (e.key === 'Enter' && renderedSearchResults[activeSearchResultIndex]) {
        e.preventDefault();
        var chosen = renderedSearchResults[activeSearchResultIndex];
        closeSearchModal();
        saveRecentSearch(chosen);
        revealSearchTarget(chosen);
      }
    });
  }

  if (searchResults) {
    searchResults.addEventListener('click', function (e) {
      var button = e.target.closest('.search-result-item');
      if (!button) return;
      var index = Number(button.getAttribute('data-search-index'));
      var item = renderedSearchResults[index];
      if (!item) return;
      closeSearchModal();
      saveRecentSearch(item);
      revealSearchTarget(item);
    });
  }

  document.addEventListener('keydown', function (e) {
    var isTyping = e.target && /input|textarea|select/i.test(e.target.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
      return;
    }
    if (!isTyping && e.key === '/') {
      e.preventDefault();
      openSearchModal();
    }
  });

  document.addEventListener('i18n:changed', function () {
    buildSearchIndex();
    if (searchModal && searchModal.classList.contains('active')) {
      renderSearchResults(siteSearchInput ? siteSearchInput.value : '');
    }
  });

  // ================================
  // 10. 细腻鼠标互动
  // ================================
  if (prefersPointerMotion()) {
    var rootStyle = document.documentElement.style;
    var interactiveCards = document.querySelectorAll(
      '.hero-quick-link, .project-card, .article-card, .resource-card, .community-card, .contact-card, .podcast-mini-card, .latest-video-card'
    );
    var magneticItems = document.querySelectorAll(
      '.hero-action, .social-link, .community-btn, .github-btn, .tool-link'
    );
    var heroVisual = document.querySelector('.hero-visual');
    var heroStage = document.querySelector('.hero-portrait-stage');
    var heroCharacter = document.querySelector('.hero-character');
    var heroOrbs = document.querySelectorAll('.glow-orb');
    var sectionRabbits = document.querySelectorAll('.section-rabbit');
    var customCursor = document.createElement('div');
    var customCursorTrail = document.createElement('div');
    var hoverTargets = document.querySelectorAll(
      'a, button, summary, .social-link, .hero-action, .hero-quick-link, .paper-link, .project-entry-summary, .project-category-header, .resource-card.expandable, .resource-toggle, .tool-link, .github-btn, .community-btn, .contact-card, [role="button"]'
    );
    var cursorX = -100;
    var cursorY = -100;
    var trailX = -100;
    var trailY = -100;

    customCursor.className = 'custom-cursor';
    customCursorTrail.className = 'custom-cursor-trail';
    customCursor.setAttribute('data-label', 'J');
    document.body.appendChild(customCursorTrail);
    document.body.appendChild(customCursor);
    document.body.classList.add('custom-cursor-enabled');

    document.addEventListener('pointermove', function (e) {
      rootStyle.setProperty('--pointer-x', e.clientX + 'px');
      rootStyle.setProperty('--pointer-y', e.clientY + 'px');
      cursorX = e.clientX;
      cursorY = e.clientY;
      customCursor.style.setProperty('--cursor-x', cursorX + 'px');
      customCursor.style.setProperty('--cursor-y', cursorY + 'px');
      customCursor.classList.add('is-visible');
      trailX += (cursorX - trailX) * 0.28;
      trailY += (cursorY - trailY) * 0.28;
      customCursorTrail.style.setProperty('--trail-x', trailX + 'px');
      customCursorTrail.style.setProperty('--trail-y', trailY + 'px');
      customCursorTrail.classList.add('is-visible');
    });

    document.addEventListener('pointerleave', function () {
      customCursor.classList.remove('is-visible', 'is-hover', 'is-active');
      customCursorTrail.classList.remove('is-visible');
    });

    document.addEventListener('pointerdown', function () {
      customCursor.classList.add('is-active');
    });

    document.addEventListener('pointerup', function () {
      customCursor.classList.remove('is-active');
    });

    hoverTargets.forEach(function (item) {
      item.addEventListener('pointerenter', function () {
        var label = item.getAttribute('data-cursor-label') || (item.tagName === 'A' ? 'Go' : 'Tap');
        customCursor.setAttribute('data-label', label);
        customCursor.classList.add('is-hover');
      });
      item.addEventListener('pointerleave', function () {
        customCursor.setAttribute('data-label', 'J');
        customCursor.classList.remove('is-hover');
      });
    });

    interactiveCards.forEach(function (card) {
      card.classList.add('interactive-card');
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) - 0.5;
        var y = ((e.clientY - rect.top) / rect.height) - 0.5;
        card.style.setProperty('--tilt-x', (x * 6).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', (y * -6).toFixed(2) + 'deg');
        card.style.setProperty('--pointer-local-x', (((e.clientX - rect.left) / rect.width) * 100).toFixed(2) + '%');
        card.style.setProperty('--pointer-local-y', (((e.clientY - rect.top) / rect.height) * 100).toFixed(2) + '%');
        card.style.setProperty('--card-lift', '-4px');
      });

      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
        card.style.removeProperty('--pointer-local-x');
        card.style.removeProperty('--pointer-local-y');
        card.style.removeProperty('--card-lift');
      });
    });

    magneticItems.forEach(function (item) {
      item.addEventListener('pointermove', function (e) {
        var rect = item.getBoundingClientRect();
        var offsetX = (e.clientX - rect.left - rect.width / 2) * 0.08;
        var offsetY = (e.clientY - rect.top - rect.height / 2) * 0.12;
        item.style.transform = 'translate(' + offsetX.toFixed(2) + 'px, ' + offsetY.toFixed(2) + 'px)';
      });

      item.addEventListener('pointerleave', function () {
        item.style.transform = '';
      });
    });

    if (heroVisual && heroStage && heroCharacter) {
      heroVisual.addEventListener('pointermove', function (e) {
        var rect = heroVisual.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) - 0.5;
        var y = ((e.clientY - rect.top) / rect.height) - 0.5;

        heroStage.style.setProperty('--hero-stage-rotate-x', (y * -8).toFixed(2) + 'deg');
        heroStage.style.setProperty('--hero-stage-rotate-y', (x * 10).toFixed(2) + 'deg');
        heroCharacter.style.setProperty('--hero-character-x', (x * 18).toFixed(2) + 'px');
        heroCharacter.style.setProperty('--hero-character-y', (y * 12).toFixed(2) + 'px');

        heroOrbs.forEach(function (orb, index) {
          var depth = (index + 1) * 8;
          orb.style.transform = 'translate(' + (x * depth).toFixed(2) + 'px, ' + (y * depth * 0.7).toFixed(2) + 'px)';
        });
      });

      heroVisual.addEventListener('pointerleave', function () {
        heroStage.style.removeProperty('--hero-stage-rotate-x');
        heroStage.style.removeProperty('--hero-stage-rotate-y');
        heroCharacter.style.removeProperty('--hero-character-x');
        heroCharacter.style.removeProperty('--hero-character-y');
        heroOrbs.forEach(function (orb) {
          orb.style.transform = '';
        });
      });
    }

    sectionRabbits.forEach(function (rabbit) {
      rabbit.addEventListener('pointermove', function (e) {
        var rect = rabbit.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) - 0.5;
        var y = ((e.clientY - rect.top) / rect.height) - 0.5;
        rabbit.style.setProperty('--rabbit-x', (x * 10).toFixed(2) + 'px');
        rabbit.style.setProperty('--rabbit-y', (y * 8).toFixed(2) + 'px');
        rabbit.style.setProperty('--rabbit-rotate', (x * 8).toFixed(2) + 'deg');
      });

      rabbit.addEventListener('pointerleave', function () {
        rabbit.style.removeProperty('--rabbit-x');
        rabbit.style.removeProperty('--rabbit-y');
        rabbit.style.removeProperty('--rabbit-rotate');
      });
    });
  }

  document.addEventListener('pointerdown', function (e) {
    if (prefersReducedMotion.matches) return;
    if (e.pointerType === 'touch') return;
    if (e.target.closest('input, textarea, select')) return;

    var burst = document.createElement('span');
    burst.className = 'click-burst';
    burst.style.left = e.clientX + 'px';
    burst.style.top = e.clientY + 'px';
    document.body.appendChild(burst);

    setTimeout(function () {
      if (burst.parentNode) {
        burst.parentNode.removeChild(burst);
      }
    }, 1500);
  });

  // ================================
  // 11. 微信公众号复制与弹窗引流
  // ================================
  var oaQrModal = document.getElementById('oaQrModal');
  var oaQrClose = document.getElementById('oaQrClose');

  if (oaQrModal && oaQrClose) {
    oaQrClose.addEventListener('click', function() {
      closeModal(oaQrModal);
    });
    oaQrModal.addEventListener('click', function(e) {
      if (e.target === oaQrModal) {
        closeModal(oaQrModal);
      }
    });
  }

  document.querySelectorAll('.btn-wechat, .rss-link').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (oaQrModal) {
        openModal(oaQrModal);
      }

      var name = '佳蔓Jemma';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(name).then(function() {
          showWechatToast();
        });
      } else {
        showWechatToast();
      }
    });
  });

  function showWechatToast() {
    var toast = document.createElement('div');
    toast.textContent = '✅ 已复制公众号名称「佳蔓Jemma」，请前往微信搜索关注';
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:12px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);opacity:0;pointer-events:none;white-space:nowrap;backdrop-filter:blur(8px);';
    document.body.appendChild(toast);
    
    // 触发动画
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.bottom = '40px';
    });

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.bottom = '20px';
      setTimeout(function() { if(toast.parentNode) toast.remove(); }, 300);
    }, 3000);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (activeModal) {
      if (activeModal === searchModal) {
        closeSearchModal();
      } else {
        closeModal(activeModal);
      }
      return;
    }
    if (mobileMenu && mobileMenu.classList.contains('active')) {
      closeMenu();
    }
  });

})();

// 复制代码
function copyCode(btn) {
  const item = btn.closest('.tool-item');
  const codeEl = item ? item.querySelector('.tool-code') : null;
  if (!codeEl) return;

  const originalText = btn.textContent;
  const copiedText = (window.i18n && window.i18n.get && window.i18n.get() === 'en') ? 'Copied' : '已复制';

  function markCopied() {
    btn.textContent = copiedText;
    setTimeout(() => { btn.textContent = originalText; }, 1500);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codeEl.textContent).then(markCopied).catch(function () {
      markCopied();
    });
    return;
  }

  markCopied();
}

// 资源搜索过滤
function filterResources(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#resources .resource-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matches = q === '' || text.includes(q);
    card.style.display = matches ? '' : 'none';
    // 搜索时自动展开匹配的栏目，清空时收起
    if (q && matches) {
      card.classList.add('expanded');
      const toggle = card.querySelector('.resource-toggle');
      if (toggle) {
        toggle.textContent = window.i18n && window.i18n.t ? window.i18n.t('collapse') : '收起';
      }
    } else if (!q) {
      card.classList.remove('expanded');
      const toggle = card.querySelector('.resource-toggle');
      if (toggle) {
        toggle.textContent = window.i18n && window.i18n.t ? window.i18n.t('expand') : '展开';
      }
    }
  });
}
