async function fetchAnnouncements(cfPath) {
  // Try user's query shape first (cubAnnouncementPaginated), then fallback
  const cubQuery = `
    query CubAnnouncementsByPath($path: ID!) {
      cubAnnouncementPaginated(
        filter: {
          _path: {
            _expressions: [{ value: $path _operator: STARTS_WITH }]
          }
        }
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
    const res = await fetch('/graphql/execute.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { path: cfPath } }),
    });
    if (!res.ok) throw new Error('network');
    return res.json();
  };

  try {
    // Try cubAnnouncementPaginated (edges/nodes)
    const d1 = await exec(cubQuery);
    const edges = d1?.data?.cubAnnouncementPaginated?.edges;
    if (Array.isArray(edges) && edges.length) {
      return edges
        .map((e) => e?.node)
        .filter(Boolean)
        .map((n) => ({
          path: n.path,
          title: n.noticeTitle,
          date: n.noticeDate,
          excerpt: n.noticeContent?.plaintext || '',
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  } catch {
    // ignore and try fallback
  }

  try {
    // Fallback to announcementList (items)
    const d2 = await exec(listQuery);
    const items = d2?.data?.announcementList?.items;
    if (Array.isArray(items)) {
      return items
        .map((n) => ({
          path: n.path,
          title: n.noticeTitle,
          date: n.noticeDate,
          excerpt: n.noticeContent?.plaintext || '',
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return [];
  } catch {
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
      const link = el.querySelector('a[href]');
      if (key === 'cfPath' && link) {
        data.cfPath = link.getAttribute('href');
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
