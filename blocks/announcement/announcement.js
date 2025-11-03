function extractCfPath(el) {
  if (!el) return '';
  // Prefer anchor href
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
  // Also check attributes on the container element
  if (el.dataset) candidates.push(el.dataset.value, el.dataset.href);
  candidates.push(el.getAttribute && el.getAttribute('data-value'));
  candidates.push(el.getAttribute && el.getAttribute('data-href'));
  candidates.push(el.textContent && el.textContent.trim());

  // Normalize and pick the first that contains a DAM/content-like path
  const normalized = candidates
    .filter(Boolean)
    .map((v) => v.toString().trim());

  // If any candidate already looks like a full content path, use it
  const direct = normalized.find((v) => v.startsWith('/content/'));
  if (direct) return direct;

  // Try to extract substring containing /content/ from any candidate
  for (let i = 0; i < normalized.length; i += 1) {
    const v = normalized[i];
    const idx = v.indexOf('/content/');
    if (idx !== -1) return v.slice(idx).split(/[\s"']+/)[0];
  }

  return '';
}

async function fetchAnnouncements(cfPath) {
  try {
    // Query: list all content fragments in the folder path
    // cfPath example: /content/dam/ktliu-testing/公告
    // Use AEM JCR API to fetch content fragments
    const searchUrl = `${cfPath}.json?limit=1000`;

    // eslint-disable-next-line no-console
    console.log('[Announcement] Fetching from:', searchUrl);

    const res = await fetch(searchUrl);
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('[Announcement] Fetch failed with status:', res.status);
      return { error: true, message: '無法讀取公告資料夾' };
    }

    const data = await res.json();
    // eslint-disable-next-line no-console
    console.log('[Announcement] Raw response:', data);

    // Parse the response - AEM returns children in various formats
    // Try direct children array first
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.children && Array.isArray(data.children)) {
      items = data.children;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    }

    // Filter and map to standardized format
    const announcements = items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        // Try various possible property names
        const pathKey = 'jcr:path';
        const titleKey = 'jcr:title';
        const createdKey = 'jcr:created';
        const undscorePath = '_path'; // avoid no-underscore-dangle
        const title = item[titleKey] || item.title || item.noticeTitle || item.name || '';
        const date = item[createdKey] || item.date || item.noticeDate || item.modified || '';
        const excerpt = item.excerpt || item.noticeContent?.plaintext || item.description || '';

        return {
          path: item[pathKey] || item.path || item[undscorePath] || cfPath,
          title: title.toString().trim(),
          date: date.toString().trim(),
          excerpt: excerpt.toString().trim(),
        };
      })
      .filter((item) => item.title) // Keep only items with title
      .sort((a, b) => {
        // Sort by date descending (newest first)
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });

    // eslint-disable-next-line no-console
    console.log('[Announcement] Parsed announcements:', announcements);

    return announcements;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Announcement] Error fetching:', err);
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
  const data = {};

  // Prefer Universal Editor authord data via data-aue-prop
  const props = block.querySelectorAll('[data-aue-prop]');
  if (props.length > 0) {
    props.forEach((el) => {
      const key = el.getAttribute('data-aue-prop');
      // cfPath is an aem-content picker, usually renders an <a>
      if (key === 'cfPath') {
        data.cfPath = extractCfPath(el);
        return;
      }
      // numbers/booleans
      const txt = el.textContent.trim();
      if (key === 'maxItems') {
        data.maxItems = txt || '10';
        return;
      }
      if (key === 'showDate') {
        data.showDate = (txt || 'true');
        return;
      }
      // optional title if present in authored content
      if (key === 'title') data.title = txt;
    });
  } else {
    // Fallback: parse table-like authored content (two-column rows)
    const rows = [...block.children];
    rows.forEach((row) => {
      const cells = [...row.children];
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const value = cells[1].textContent.trim();
        data[key] = value;
      }
    });
  }

  const {
    title = '',
    cfPath = '',
    maxItems = '10',
    showDate = 'true',
  } = data;

  // Debug: log extracted cfPath
  // eslint-disable-next-line no-console
  console.log('[Announcement] Extracted cfPath:', cfPath);

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

  const announcements = await fetchAnnouncements(cfPath);

  // Debug: log GraphQL response and announcements
  // eslint-disable-next-line no-console
  console.log('[Announcement] Fetched announcements:', announcements);

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
}
