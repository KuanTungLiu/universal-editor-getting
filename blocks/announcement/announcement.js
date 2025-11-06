/* 使用 GraphQL 取得公告列表，優先使用 Persisted Query (GET) 避免 CORS/Dispatcher 擋下，
   若 PQ 失敗才回退到原本的 JCR JSON 解析（不再使用 proxy）。
*/
const PQ_WORKSPACE = 'ktliu-testing';
const PQ_NAME = 'Announcement'; // 你在 AEM 發佈的 Persisted Query 名稱
const PQ_BASE = `/graphql/execute.json/${PQ_WORKSPACE}/${PQ_NAME}`;
const ENABLE_JCR_FALLBACK = true;

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

function mapEdgesToItems(edges = []) {
  return edges.map(({ node }) => {
    const pathKey = '_path';
    return {
      path: (node && node[pathKey]) || '',
      title: (node && node.noticeTitle) || '',
      date: (node && node.noticeDate) || '',
      excerpt: (node && node.noticeContent && node.noticeContent.html) || '',
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

/* Normalize path for PQ: if cfPath already contains percent-encoding (%xx),
   decode it first so we don't double-encode. Then encodeURIComponent once. */
function normalizeCfPathForQuery(cfPath) {
  if (!cfPath) return '';
  try {
    // detect if contains percent-encoding like %E5 or %2F
    const hasPercentEncoding = /%[0-9A-Fa-f]{2}/.test(cfPath);
    const decoded = hasPercentEncoding ? decodeURIComponent(cfPath) : cfPath;
    return encodeURIComponent(decoded);
  } catch (e) {
    // 如果 decode 出錯（極少數），fallback 為 encode 原始字串
    return encodeURIComponent(cfPath);
  }
}

/* 優先使用 Persisted Query (GET) */
async function fetchAnnouncementsPQ(cfPath, limit = 10) {
  // Normalize to avoid double-encoding (fixes Variable 'path' coerced Null)
  const encodedPath = normalizeCfPathForQuery(cfPath);
  const url = `${PQ_BASE}?path=${encodedPath}&limit=${encodeURIComponent(limit)}`;
  // eslint-disable-next-line no-console
  console.log('🔍 [PQ] 原始 cfPath:', cfPath);
  // eslint-disable-next-line no-console
  console.log('🔍 [PQ] 編碼後 encodedPath:', encodedPath);
  // eslint-disable-next-line no-console
  console.log('🔍 [PQ] 嘗試 GET:', url);

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin', // 若需跨域帶 cookie，改 'include' 並確保 CORS supportsCredentials=true
    headers: { Accept: 'application/json' },
  });
  // eslint-disable-next-line no-console
  console.log('🔁 [PQ] HTTP 狀態:', res.status);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[PQ] HTTP ${res.status}: ${text}`);
  }
  const payload = await res.json();
  if (payload.errors && payload.errors.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  const edges = payload?.data?.cubAnnouncementPaginated?.edges || [];
  const items = mapEdgesToItems(edges);
  return filterAndSortAnnouncements(items);
}

/* 原本的 JCR JSON 版本（保留做為回退用） */
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
    let successUrl = null;

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
          successUrl = url;
          console.log('  ✅ 成功！資料:', data);
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

    console.log('🎉 成功從', successUrl, '取得資料');
    console.log('🔑 資料的所有 keys:', Object.keys(data));

    let items = [];

    if (Array.isArray(data)) {
      items = data;
      console.log('📋 資料是陣列，長度:', items.length);
    } else if (data && typeof data === 'object') {
      const allKeys = Object.keys(data);
      console.log('🔍 檢查這些 keys:', allKeys);

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
          console.log(`  ✓ 找到 key: ${key}, 類型:`, typeof data[key]);
          if (Array.isArray(data[key])) {
            foundKey = key;
            items = data[key];
            console.log(`📋 從 ${key} 取得項目，長度:`, items.length);
            break;
          } else if (typeof data[key] === 'object') {
            const nestedKeys = Object.keys(data[key]);
            console.log(`  ${key} 是物件，它的 keys:`, nestedKeys);
            for (let j = 0; j < nestedKeys.length; j += 1) {
              const nestedKey = nestedKeys[j];
              if (Array.isArray(data[key][nestedKey])) {
                items = data[key][nestedKey];
                console.log(`📋 從 ${key}.${nestedKey} 取得項目，長度:`, items.length);
                foundKey = `${key}.${nestedKey}`;
                break;
              }
            }
            if (foundKey) break;
          }
        }
      }

      if (!foundKey) {
        console.log('⚠️ 沒找到標準的子項目 key');
        console.log('🔍 嘗試從物件屬性中提取子節點...');

        const childNodes = [];
        allKeys.forEach((key) => {
          if (key.startsWith('jcr:') || key.startsWith('sling:') || key.startsWith('rep:')) {
            console.log(`  ⏭️ 跳過系統屬性: ${key}`);
            return;
          }
          const value = data[key];
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            console.log(`  ✓ 找到可能的子節點: ${key}`, value);
            childNodes.push({ ...value, name: key });
          }
        });

        if (childNodes.length > 0) {
          items = childNodes;
          console.log(`📋 從物件屬性中提取出 ${childNodes.length} 個子節點`);
        } else {
          console.log('⚠️ 完全沒找到子項目，將整個物件視為單一項目');
          console.log('📋 完整資料結構:', JSON.stringify(data, null, 2));
          items = [data];
        }
      }
    }

    console.log('🔍 總共找到', items.length, '個項目');

    const announcements = items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const nameKey = '_name'; // eslint-disable-line no-underscore-dangle
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
  console.log('=== News Block 開始（GraphQL PQ 優先，無 proxy） ===');
  console.log('📦 Block:', block);

  const data = {};

  const props = block.querySelectorAll('[data-aue-prop]');
  console.log('🔍 找到', props.length, '個 data-aue-prop');

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
        const cell = cells[0];
        const cellLinks = cell.querySelectorAll('a[href]');
        if (cellLinks.length > 0 && !data.cfPath) {
          data.cfPath = extractCfPath(cellLinks[0]);
        }
      }
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const valueCell = cells[1];
        if (key === 'cfPath' || key === 'CF Folder Path' || key.includes('公告資料夾')) {
          data.cfPath = extractCfPath(valueCell);
        } else {
          const value = valueCell.textContent.trim();
          data[key] = value;
        }
      }
    });
  }

  console.log('📊 解析後的 data:', data);

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
    console.error('❌ cfPath 是空的！');
    newsList.innerHTML = '<div class="error">請設定公告資料夾路徑</div>';
    return;
  }

  console.log('🚀 開始取得公告（PQ -> JCR 回退）...');
  let announcements;
  try {
    // 先嘗試 Persisted Query (GET)
    announcements = await fetchAnnouncementsPQ(cfPath, parseInt(maxItems, 10));
    console.log('✅ 使用 PQ 取得公告');
  } catch (pqErr) {
    console.warn('⚠️ PQ 失敗，原因:', pqErr.message);
    if (ENABLE_JCR_FALLBACK) {
      console.log('↩️ 啟動 JCR JSON 回退機制...');
      announcements = await fetchAnnouncementsJcr(cfPath);
    } else {
      newsList.innerHTML = `<div class="error">讀取公告失敗：${pqErr.message}</div>`;
      return;
    }
  }

  console.log('📬 取得結果:', announcements);

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
  console.log('📝 顯示', displayItems.length, '筆資料');

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

    newsList.appendChild(item);
  });

  console.log('=== News Block 完成（GraphQL PQ 優先，無 proxy） ===');
}
