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

async function fetchAnnouncements(cfPath) {
  console.log('🔍 開始 fetch，路徑:', cfPath);

  const cubQuery = `
    query CubAnnouncementsByPath($path: ID!) {
      cubAnnouncementPaginated(
        filter: {
          _path: {
            _expressions: [{ value: $path _operator: STARTS_WITH }]
          }
        }
        sort: "noticeDate DESC"
      ) {
        edges {
          node {
            _path
            noticeTitle
            noticeDate
            noticeContent { plaintext html }
          }
        }
      }
    }
  `;

  const listQuery = `
    query AnnouncementsByPath($path: ID!) {
      announcementList(
        filter: {
          _path: { _expressions: [{ value: $path _operator: STARTS_WITH }] }
        }
        _sort: "noticeDate DESC"
      ) {
        items {
          _path
          noticeTitle
          noticeDate
          noticeContent { plaintext }
        }
      }
    }
  `;

  const exec = async (query) => {
    console.log('📤 發送請求:', {
      url: '/graphql/execute.json',
      variables: { path: cfPath },
    });

    const res = await fetch('/graphql/execute.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { path: cfPath } }),
    });

    console.log('📥 回應狀態:', res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ 請求失敗:', text);
      throw new Error('network');
    }

    const json = await res.json();
    console.log('📊 回應資料:', json);
    return json;
  };

  try {
    console.log('🎯 嘗試 cubAnnouncementPaginated...');
    const d1 = await exec(cubQuery);
    const edges = d1?.data?.cubAnnouncementPaginated?.edges;
    console.log('📋 edges:', edges);

    if (Array.isArray(edges) && edges.length) {
      console.log('✅ 成功！找到', edges.length, '筆資料');
      const pathKey = '_path';
      return edges
        .map((e) => e?.node)
        .filter(Boolean)
        .map((n) => ({
          path: (n && n[pathKey]) || n.path,
          title: n.noticeTitle,
          date: n.noticeDate,
          excerpt: n.noticeContent?.plaintext || '',
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    console.log('⚠️ cubAnnouncementPaginated 沒有資料，嘗試 fallback...');
  } catch (err) {
    console.error('❌ cubAnnouncementPaginated 失敗:', err);
  }

  try {
    console.log('🎯 嘗試 announcementList...');
    const d2 = await exec(listQuery);
    const items = d2?.data?.announcementList?.items;
    console.log('📋 items:', items);

    if (Array.isArray(items)) {
      console.log('✅ 成功！找到', items.length, '筆資料');
      const pathKey = '_path';
      return items
        .map((n) => ({
          path: (n && n[pathKey]) || n.path,
          title: n.noticeTitle,
          date: n.noticeDate,
          excerpt: n.noticeContent?.plaintext || '',
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    console.log('⚠️ announcementList 沒有資料');
    return [];
  } catch (err) {
    console.error('❌ announcementList 失敗:', err);
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
  console.log('=== News Block 開始 ===');
  console.log('📦 Block:', block);

  const data = {};

  const props = block.querySelectorAll('[data-aue-prop]');
  console.log('🔍 找到', props.length, '個 data-aue-prop');

  if (props.length > 0) {
    props.forEach((el) => {
      const key = el.getAttribute('data-aue-prop');
      console.log('  -', key, ':', el);

      if (key === 'cfPath') {
        data.cfPath = extractCfPath(el);
        console.log('    📂 解析出的路徑:', data.cfPath);
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
    console.log('⚠️ 沒有 data-aue-prop，使用 table 模式');
    const rows = [...block.children];
    rows.forEach((row) => {
      const cells = [...row.children];
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const value = cells[1].textContent.trim();
        console.log('  -', key, ':', value);
        data[key] = value;
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

  console.log('🚀 開始 fetch announcements...');
  const announcements = await fetchAnnouncements(cfPath);

  console.log('📬 fetch 結果:', announcements);

  newsList.innerHTML = '';

  if (announcements.error) {
    newsList.innerHTML = `<div class="error">${announcements.message}</div>`;
    return;
  }

  if (announcements.length === 0) {
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

  console.log('=== News Block 完成 ===');
}
