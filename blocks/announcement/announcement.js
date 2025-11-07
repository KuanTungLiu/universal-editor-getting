/* announcement.js
   使用 Persisted Query (matrix-param ;path=) 直接從 /graphql/execute.json/... 取得資料。
   若 PQ 失敗（或回傳 errors），會回退到 JCR JSON 解析（ENABLE_JCR_FALLBACK 控制）。
   已修正 ESLint 問題：no-underscore-dangle、prefer-destructuring、no-unused-vars
*/
const PQ_WORKSPACE = 'ktliu-testing';
const PQ_NAME = 'Announcement'; // Persisted Query 名稱
// 使用 matrix param 形式（你提供的可用形式）
const PQ_MATRIX_BASE = `/graphql/execute.json/${PQ_WORKSPACE}/${PQ_NAME};path=`;
const ENABLE_JCR_FALLBACK = true;
// 用於取 node 的 path 欄位（變數名稱沒有前導下劃線）
const PATH_PROP = '_path';

function extractCfPath(el) {
  if (!el) return '';
  const link = el.querySelector && el.querySelector('a');
  const candidates = [];
  if (link) {
    candidates.push(link.getAttribute('href'));
    candidates.push(link.href);
    if (link.dataset) candidates.push(link.dataset.value, link.dataset.href);
    candidates.push(link.getAttribute('data-value'));
    candidates.push(link.getAttribute('data-href'));
    candidates.push(link.textContent && link.textContent.trim());
  }
  if (el.dataset) candidates.push(el.dataset.value, el.dataset.href);
  candidates.push(el.getAttribute && el.getAttribute('data-value'));
  candidates.push(el.getAttribute && el.getAttribute('data-href'));
  candidates.push(el.textContent && el.textContent.trim());

  const normalized = candidates
    .filter(Boolean)
    .map((v) => v.toString().trim());

  const direct = normalized.find((v) => v.startsWith('/content/'));
  if (direct) return direct;

  for (let i = 0; i < normalized.length; i += 1) {
    const v = normalized[i];
    const idx = v.indexOf('/content/');
    if (idx !== -1) return v.slice(idx).split(/[\s"']+/)[0];
  }

  return '';
}

/* 將 HTML 字串轉成純文字 */
function htmlToText(html) {
  if (!html) return '';
  try {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent.trim();
  } catch (e) {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

/* slugify for fallback path */
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mapEdgesToItems(edges = [], cfPath = '') {
  const decodedCfPath = cfPath ? decodeURIComponent(cfPath) : '';
  return edges.map(({ node }, idx) => {
    const pathCandidates = [
      (node && node[PATH_PROP]),
      (node && node.path),
      (node && node['jcr:path']),
      (node && node['jcr:name']),
      (node && node.name),
    ].filter(Boolean);

    // prefer-destructuring: 使用陣列解構取得第一個候選路徑
    const [firstCandidate] = pathCandidates;
    const path = firstCandidate || (() => {
      const base = decodedCfPath || '';
      const titlePart = node?.noticeTitle ? slugify(node.noticeTitle) : `item-${idx + 1}`;
      const safeBase = base.endsWith('/') ? base.slice(0, -1) : base;
      return safeBase ? `${safeBase}/${encodeURIComponent(titlePart)}` : `/${encodeURIComponent(titlePart)}`;
    })();

    const excerptHtml = node?.noticeContent?.html || '';
    const excerptText = htmlToText(excerptHtml);

    return {
      path,
      title: node?.noticeTitle || '',
      date: node?.noticeDate || '',
      excerpt: excerptText,
      excerptHtml,
    };
  });
}

function filterAndSortAnnouncements(items = []) {
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return items
    .filter((item) => {
      if (!item || !item.title) return false;
      if (!item.date) return true;
      const d = new Date(item.date);
      const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dOnly <= todayOnly;
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

/* 如果 cfPath 已經包含 %xx 編碼，先解碼一次避免 double-encode */
function ensureDecodedCfPath(cfPath) {
  if (!cfPath) return '';
  try {
    if (/%[0-9A-Fa-f]{2}/.test(cfPath)) {
      return decodeURIComponent(cfPath);
    }
    return cfPath;
  } catch (e) {
    return cfPath;
  }
}

/* 使用 matrix-param PQ GET（你確認這個形式在 author/publish 都可用） */
async function fetchAnnouncementsPQ(cfPath, limit = 10) {
  if (!cfPath) throw new Error('cfPath 未設定');

  const decodedPath = ensureDecodedCfPath(cfPath);
  // 建構 URL：matrix param 後面可接 query string (limit)
  const endpoint = `${PQ_MATRIX_BASE}${encodeURIComponent(decodedPath)}?limit=${encodeURIComponent(limit)}`;

  // debug log
  console.log('🔍 [PQ] GET (matrix) 於:', endpoint);

  const res = await fetch(endpoint, {
    method: 'GET',
    credentials: 'same-origin', // 若需要帶 cookie，或改為 'include'
    headers: { Accept: 'application/json' },
  });

  console.log('🔁 [PQ] HTTP 狀態:', res.status);
  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`[PQ] 無法解析回應為 JSON: ${e.message}\nbody: ${text}`);
  }

  if (payload.errors && payload.errors.length) {
    console.warn('[PQ] GraphQL errors:', payload.errors);
    const msg = payload.errors.map((er) => er.message).join('; ');
    const err = new Error(`[PQ] GraphQL errors: ${msg}`);
    err.payload = payload;
    throw err;
  }

  const edges = payload?.data?.cubAnnouncementPaginated?.edges || [];
  const items = mapEdgesToItems(edges, cfPath);
  return filterAndSortAnnouncements(items);
}

/* JCR JSON 回退（保留原本多端點嘗試邏輯） */
async function fetchAnnouncementsJcr(cfPath) {
  console.log('🔍 [JCR] 開始 fetch，路徑:', cfPath);

  try {
    const decodedPath = decodeURIComponent(cfPath);
    const endpoints = [
      `${cfPath}.infinity.json`,
      `${decodedPath}.infinity.json`,
      `${cfPath}.2.json`,
      `${cfPath}.1.json`,
      `${decodedPath}.2.json`,
      `${cfPath}.json`,
    ];

    let data = null;

    for (let i = 0; i < endpoints.length; i += 1) {
      const url = endpoints[i];
      console.log(`🌐 嘗試端點 ${i + 1}:`, url);
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(url);
        console.log('  ↪️ 狀態:', res.status);
        if (res.ok) {
          // eslint-disable-next-line no-await-in-loop
          data = await res.json();
          console.log('  ✅ 成功！資料來自:', url, data);
          break;
        }
      } catch (err) {
        console.log('  ⚠️ 失敗:', err.message);
      }
    }

    if (!data) {
      console.error('❌ 所有端點都失敗');
      return { error: true, message: '無法讀取公告資料夾' };
    }

    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === 'object') {
      const allKeys = Object.keys(data);
      const possibleChildKeys = [
        ':children',
        'children',
        ':items',
        'items',
        'content',
        ':content',
      ];

      let foundKey = null;
      for (let i = 0; i < possibleChildKeys.length; i += 1) {
        const key = possibleChildKeys[i];
        if (data[key]) {
          if (Array.isArray(data[key])) {
            foundKey = key;
            items = data[key];
            break;
          } else if (typeof data[key] === 'object') {
            const nestedKeys = Object.keys(data[key]);
            for (let j = 0; j < nestedKeys.length; j += 1) {
              const nestedKey = nestedKeys[j];
              if (Array.isArray(data[key][nestedKey])) {
                items = data[key][nestedKey];
                foundKey = `${key}.${nestedKey}`;
                break;
              }
            }
            if (foundKey) break;
          }
        }
      }

      if (!foundKey) {
        const childNodes = [];
        allKeys.forEach((key) => {
          if (key.startsWith('jcr:') || key.startsWith('sling:') || key.startsWith('rep:')) {
            return;
          }
          const value = data[key];
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            childNodes.push({ ...value, name: key });
          }
        });

        if (childNodes.length > 0) {
          items = childNodes;
        } else {
          items = [data];
        }
      }
    }

    const announcements = items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const nameKey = '_name';
        const nodeName = item[nameKey] || '';
        const jcrContent = item['jcr:content'];

        let cfData = null;
        if (jcrContent) {
          if (jcrContent.data) {
            if (jcrContent.data.master) {
              cfData = jcrContent.data.master;
            } else {
              cfData = jcrContent.data;
            }
          } else {
            cfData = jcrContent;
          }
        }

        const pathKey = 'jcr:path';
        const titleKey = 'jcr:title';
        const createdKey = 'jcr:created';
        const modifiedKey = 'jcr:lastModified';
        const undscorePath = 'path';

        const title = cfData?.noticeTitle
          || cfData?.title
          || cfData?.[titleKey]
          || item[titleKey]
          || item.title
          || item.noticeTitle
          || item.name
          || item['jcr:name']
          || nodeName
          || '';

        const date = cfData?.noticeDate
          || cfData?.date
          || cfData?.published
          || item.noticeDate
          || item.date
          || item[modifiedKey]
          || item[createdKey]
          || item.published
          || '';

        const excerpt = cfData?.noticeContent?.plaintext
          || cfData?.noticeContent
          || cfData?.excerpt
          || cfData?.description
          || item.excerpt
          || item.noticeContent?.plaintext
          || item.description
          || item['jcr:description']
          || '';

        const path = item[pathKey]
          || item.path
          || item[undscorePath]
          || `${cfPath}/${item.name || item['jcr:name'] || nodeName || ''}`;

        return {
          path,
          title: title.toString().trim(),
          date: date.toString().trim(),
          excerpt: excerpt.toString().trim(),
        };
      })
      .filter((item) => {
        const hasTitle = !!item.title;
        if (!hasTitle) return false;

        if (item.date) {
          const noticeDate = new Date(item.date);
          const now = new Date();
          const noticeDateOnly = new Date(
            noticeDate.getFullYear(),
            noticeDate.getMonth(),
            noticeDate.getDate(),
          );
          const todayOnly = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          if (noticeDateOnly > todayOnly) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    console.log('✅ [JCR] 解析出', announcements.length, '個公告');
    return announcements;
  } catch (err) {
    console.error('❌ [JCR] fetchAnnouncements 錯誤:', err);
    return { error: true, message: '無法連線至伺服器' };
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export default async function decorate(block) {
  console.log('=== News Block 開始（GraphQL PQ matrix-param 優先，無 proxy） ===');
  const data = {};

  const props = block.querySelectorAll('[data-aue-prop]');
  if (props.length > 0) {
    props.forEach((el) => {
      const key = el.getAttribute('data-aue-prop');
      if (key === 'cfPath') {
        data.cfPath = extractCfPath(el);
        return;
      }
      const txt = el.textContent.trim();
      if (key === 'maxItems') {
        data.maxItems = txt || '10';
        return;
      }
      if (key === 'showDate') {
        data.showDate = (txt || 'true');
        return;
      }
      if (key === 'title') data.title = txt;
    });
  } else {
    // fallback 掃描
    const allLinks = block.querySelectorAll('a[href]');
    allLinks.forEach((link) => {
      if (!data.cfPath && link.href && link.href.includes('/content/')) {
        data.cfPath = extractCfPath(link);
      }
    });
    const allText = block.textContent;
    if (!data.cfPath && allText.includes('/content/')) {
      const match = allText.match(/\/content\/[^\s"'<>]+/);
      if (match) {
        const [matchedPath] = match;
        data.cfPath = matchedPath;
      }
    }
    const rows = [...block.children];
    rows.forEach((row) => {
      const cells = [...row.children];
      if (cells.length === 1) {
        const [cell] = cells;
        const cellLinks = cell.querySelectorAll('a[href]');
        if (cellLinks.length > 0 && !data.cfPath) {
          data.cfPath = extractCfPath(cellLinks[0]);
        }
      }
      if (cells.length >= 2) {
        const [firstCell, secondCell] = cells;
        const key = firstCell.textContent.trim();
        const valueCell = secondCell;
        if (key === 'cfPath' || key === 'CF Folder Path' || key.includes('公告資料夾')) {
          data.cfPath = extractCfPath(valueCell);
        } else {
          const value = valueCell.textContent.trim();
          data[key] = value;
        }
      }
    });
  }

  const {
    title = '',
    cfPath = '',
    maxItems = '10',
    showDate = 'true',
  } = data;

  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'news-container';

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'news-section-title';
    titleEl.textContent = title;
    container.appendChild(titleEl);
  }

  const newsList = document.createElement('div');
  newsList.className = 'news-list';
  newsList.innerHTML = '<div class="loading">載入中...</div>';
  container.appendChild(newsList);
  block.appendChild(container);

  if (!cfPath) {
    newsList.innerHTML = '<div class="error">請設定公告資料夾路徑</div>';
    return;
  }

  console.log('🚀 開始取得公告（PQ matrix -> JCR 回退）...');
  let announcements;
  try {
    announcements = await fetchAnnouncementsPQ(cfPath, parseInt(maxItems, 10));
    console.log('✅ 使用 PQ 取得公告');
  } catch (pqErr) {
    console.warn('⚠️ PQ 失敗，原因:', pqErr.message, pqErr.pqAttempts || '');
    if (ENABLE_JCR_FALLBACK) {
      announcements = await fetchAnnouncementsJcr(cfPath);
    } else {
      newsList.innerHTML = `<div class="error">讀取公告失敗：${pqErr.message}</div>`;
      return;
    }
  }

  newsList.innerHTML = '';

  if (announcements.error) {
    newsList.innerHTML = `<div class="error">${announcements.message}</div>`;
    return;
  }

  if (!announcements || announcements.length === 0) {
    newsList.innerHTML = '<div class="no-data">目前沒有公告</div>';
    return;
  }

  const displayItems = announcements.slice(0, parseInt(maxItems, 10));
  displayItems.forEach((announcement) => {
    const item = document.createElement('a');
    item.className = 'news-item';
    item.href = announcement.path || '#';

    if (showDate === 'true' && announcement.date) {
      const dateEl = document.createElement('div');
      dateEl.className = 'news-date';
      dateEl.textContent = formatDate(announcement.date);
      item.appendChild(dateEl);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'news-title';
    titleEl.textContent = announcement.title;
    item.appendChild(titleEl);

    if (announcement.excerpt) {
      const excerptEl = document.createElement('div');
      excerptEl.className = 'news-excerpt';
      excerptEl.textContent = announcement.excerpt;
      item.appendChild(excerptEl);
    }

    newsList.appendChild(item);
  });
}
