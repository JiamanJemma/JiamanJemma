/**
 * Cloudflare Pages Function — Substack RSS → JSON
 * GET /api/articles
 */
export async function onRequestGet() {
  var headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    var res = await fetch('https://jemma747318.substack.com/feed');
    if (!res.ok) throw new Error('Feed fetch failed: ' + res.status);

    var xml = await res.text();
    var articles = parseRSS(xml);

    return new Response(JSON.stringify(articles), { headers: headers });
  } catch (e) {
    headers['Cache-Control'] = 'public, max-age=300';
    return new Response(JSON.stringify([]), { status: 502, headers: headers });
  }
}

function parseRSS(xml) {
  var articles = [];
  var re = /<item>([\s\S]*?)<\/item>/g;
  var m;

  while ((m = re.exec(xml)) !== null) {
    var item = m[1];
    var title = cdata(item, 'title') || tag(item, 'title');
    var link = tag(item, 'link');
    var pubDate = tag(item, 'pubDate');
    var desc = cdata(item, 'description') || tag(item, 'description');

    // Fallback: try content:encoded for excerpt if description is empty
    if (!desc || strip(desc).length < 10) {
      var content = cdata(item, 'content:encoded') || '';
      // Take first <p> content
      var pMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      if (pMatch) desc = pMatch[1];
    }

    var d = new Date(pubDate);
    var date = d.getFullYear() + '.' +
      String(d.getMonth() + 1).padStart(2, '0') + '.' +
      String(d.getDate()).padStart(2, '0');

    var excerpt = strip(desc || '');
    if (excerpt.length > 120) excerpt = excerpt.slice(0, 120) + '…';

    articles.push({ title: title, link: link, date: date, excerpt: excerpt });
  }

  return articles;
}

function cdata(xml, t) {
  // Handle both regular tags and namespaced tags like content:encoded
  var escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var m = xml.match(new RegExp('<' + escaped + '>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/' + escaped + '>'));
  return m ? m[1].trim() : null;
}

function tag(xml, t) {
  var escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var m = xml.match(new RegExp('<' + escaped + '>([\\s\\S]*?)<\\/' + escaped + '>'));
  return m ? m[1].trim() : '';
}

function strip(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
