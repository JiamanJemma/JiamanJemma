/**
 * YouTube 集成模块
 * 三层降级：API v3 → RSS Feed → 静态链接
 * 依赖 config.js 中的 window.YOUTUBE_API_KEY
 */
(function () {
  'use strict';

  // ---- 配置 ----
  var CHANNEL_ID = 'UCSrk3Zvkt5pP2I04WfQVxsw';
  var CHANNEL_URL = 'https://www.youtube.com/channel/' + CHANNEL_ID;
  var API_BASE = 'https://www.googleapis.com/youtube/v3';
  var apiKey = (typeof window.YOUTUBE_API_KEY !== 'undefined') ? window.YOUTUBE_API_KEY : '';

  // ---- DOM 工具 ----
  function $(id) { return document.getElementById(id); }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (_) { return iso; }
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('API ' + r.status);
      return r.json();
    });
  }

  // ---- 频道描述（Hero 区） ----
  function showChannelDesc(text) {
    var el = $('channel-desc');
    if (!el || !text) return;
    el.style.display = 'block';
    el.classList.remove('loading');
    el.textContent = text;
  }

  function hideChannelDesc() {
    var el = $('channel-desc');
    if (el) el.style.display = 'none';
  }

  // ---- 最新视频特色卡片 ----
  function setLatestVideo(videoId, title, thumbUrl, publishedAt) {
    var wrap = $('latest-video-wrap');
    var card = $('latest-video-card');
    if (!wrap || !card) return;

    wrap.style.display = 'block';
    card.classList.remove('loading');
    card.href = 'https://www.youtube.com/watch?v=' + videoId;

    var thumb = $('latest-video-thumb');
    if (thumb) {
      thumb.className = '';
      thumb.innerHTML = '<img src="' + (thumbUrl || '').replace(/&/g, '&amp;') + '" alt="" loading="lazy">';
    }

    var titleEl = $('latest-video-title');
    if (titleEl) {
      titleEl.className = 'latest-video-title';
      titleEl.textContent = title || '最新视频';
    }

    var meta = $('latest-video-meta');
    if (meta) {
      meta.textContent = publishedAt ? '发布于 ' + formatDate(publishedAt) : '最新视频';
    }
  }

  function hideLatestVideo() {
    var wrap = $('latest-video-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  // ---- 视频网格渲染 ----
  function renderVideoGrid(videos) {
    var container = $('videos-container');
    if (!container || !videos.length) return;

    container.innerHTML = videos.map(function (v) {
      return '<a href="https://www.youtube.com/watch?v=' + v.videoId + '" target="_blank" rel="noopener noreferrer" class="video-card">' +
        '<div class="video-thumb-wrap">' +
        '<img src="' + v.thumbnail + '" alt="" loading="lazy">' +
        '<div class="play-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' +
        '</div>' +
        '<div class="video-info">' +
        '<h3 class="video-title">' + v.title + '</h3>' +
        '<p class="video-meta">' + formatDate(v.published) + '</p>' +
        '</div></a>';
    }).join('');

    // 触发 Intersection Observer（script.js 中注册）
    if (typeof window.observeNewCards === 'function') {
      window.observeNewCards();
    }
  }

  // ---- 静态降级 ----
  function renderFallback() {
    var container = $('videos-container');
    if (container) {
      container.innerHTML = '<div class="video-fallback">' +
        '<p>访问 YouTube 频道查看最新视频</p>' +
        '<a href="' + CHANNEL_URL + '" target="_blank" rel="noopener noreferrer">@JiamanJemma</a>' +
        '</div>';
    }
  }

  // ---- 方式一：YouTube Data API v3 ----
  function loadWithApi() {
    if (!apiKey) {
      loadWithRss();
      return;
    }

    // 直接用已知 Channel ID（省掉 search 步骤，节约配额）
    var channelUrl = API_BASE + '/channels?part=snippet,contentDetails&id=' + CHANNEL_ID + '&key=' + apiKey;

    fetchJson(channelUrl)
      .then(function (channelData) {
        var ch = channelData.items && channelData.items[0];

        // 频道描述
        if (ch && ch.snippet && ch.snippet.description) {
          showChannelDesc(ch.snippet.description);
        } else {
          hideChannelDesc();
        }

        // 获取上传播放列表
        var uploadsId = ch && ch.contentDetails &&
          ch.contentDetails.relatedPlaylists &&
          ch.contentDetails.relatedPlaylists.uploads;

        if (!uploadsId) {
          hideLatestVideo();
          renderFallback();
          return;
        }

        var playlistUrl = API_BASE + '/playlistItems?part=snippet&playlistId=' +
          encodeURIComponent(uploadsId) + '&maxResults=7&key=' + apiKey;

        return fetchJson(playlistUrl);
      })
      .then(function (playlistData) {
        if (!playlistData) return;
        var items = playlistData.items || [];

        if (items.length === 0) {
          hideLatestVideo();
          renderFallback();
          return;
        }

        // 第一个作为特色卡片
        var first = items[0].snippet;
        var firstThumb = first.thumbnails && (first.thumbnails.maxres || first.thumbnails.standard || first.thumbnails.high || first.thumbnails.medium || first.thumbnails.default);
        setLatestVideo(
          first.resourceId.videoId,
          first.title,
          firstThumb && firstThumb.url,
          first.publishedAt
        );

        // 其余进网格
        var gridVideos = items.slice(1).map(function (item) {
          var sn = item.snippet;
          var th = sn.thumbnails && (sn.thumbnails.maxres || sn.thumbnails.standard || sn.thumbnails.high || sn.thumbnails.medium || sn.thumbnails.default);
          return {
            videoId: sn.resourceId.videoId,
            title: sn.title,
            thumbnail: th ? th.url : '',
            published: sn.publishedAt
          };
        });

        if (gridVideos.length > 0) {
          renderVideoGrid(gridVideos);
        } else {
          var container = $('videos-container');
          if (container) container.innerHTML = '';
        }
      })
      .catch(function (err) {
        console.error('YouTube API error:', err);
        hideChannelDesc();
        loadWithRss();
      });
  }

  // ---- 方式二：RSS Feed（通过 CORS 代理） ----
  function fetchWithFallback(urls) {
    if (!urls.length) return Promise.reject(new Error('All proxies failed'));
    return fetch(urls[0]).then(function(r) {
      if (!r.ok) throw new Error('Bad status');
      return r.text();
    }).catch(function(e) {
      console.warn('Proxy ' + urls[0] + ' failed, trying next...');
      return fetchWithFallback(urls.slice(1));
    });
  }

  function loadWithRss() {
    var rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
    var proxies = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(rssUrl),
      'https://corsproxy.io/?' + encodeURIComponent(rssUrl),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(rssUrl)
    ];

    fetchWithFallback(proxies)
      .then(function (text) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(text, 'text/xml');
        var entries = xml.querySelectorAll('entry');

        if (entries.length === 0) throw new Error('No entries in RSS');

        var videos = Array.prototype.slice.call(entries, 0, 7).map(function (entry) {
          // Robust XML namespace parsing
          var vIdNode = entry.getElementsByTagNameNS('*', 'videoId')[0] || entry.getElementsByTagName('yt:videoId')[0];
          var videoId = vIdNode ? vIdNode.textContent : '';

          var tNode = entry.getElementsByTagName('title')[0];
          var title = tNode ? tNode.textContent : '';

          var pNode = entry.getElementsByTagName('published')[0];
          var published = pNode ? pNode.textContent : '';

          // Look for media:thumbnail
          var thumbGroup = entry.getElementsByTagNameNS('*', 'group')[0] || entry.getElementsByTagName('media:group')[0] || entry;
          var thumbNode = thumbGroup.getElementsByTagNameNS('*', 'thumbnail')[0] || thumbGroup.getElementsByTagName('media:thumbnail')[0];
          
          var thumbnail = thumbNode && thumbNode.getAttribute('url')
            ? thumbNode.getAttribute('url')
            : 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg'; // Better fallback quality

          return { videoId: videoId, title: title, published: published, thumbnail: thumbnail };
        }).filter(function(v) { return !!v.videoId; });

        if (videos.length === 0) throw new Error('Failed to parse videos from RSS');

        // 第一个作为特色卡片
        setLatestVideo(videos[0].videoId, videos[0].title, videos[0].thumbnail, videos[0].published);

        // 其余进网格
        if (videos.length > 1) {
          renderVideoGrid(videos.slice(1));
        } else {
          var container = $('videos-container');
          if (container) container.innerHTML = '';
        }
      })
      .catch(function (err) {
        console.error('RSS fallback error:', err);
        hideLatestVideo();
        renderFallback();
      });
  }

  // ---- 初始化 ----
  function init() {
    loadWithApi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
