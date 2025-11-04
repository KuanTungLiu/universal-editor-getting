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

  try {
    // Use AEM's .json API to fetch folder contents
    // Decode URL-encoded path for display
    const decodedPath = decodeURIComponent(cfPath);
    console.log('📂 解碼後路徑:', decodedPath);

    // Try different API endpoints with varying depth and selectors
    // - .1.json = depth 1 (includes immediate children)
    // - .2.json = depth 2 (includes children and their children)
    // - .infinity.json = all descendants (use with caution)
    // - .children.json = special selector for children
    const endpoints = [
      `${cfPath}.2.json`, // depth 2 (best for Content Fragments)
      `${cfPath}.1.json`, // depth 1
      `${cfPath}.infinity.json`, // all levels (may be slow)
      `${decodedPath}.2.json`, // decoded path, depth 2
      `${decodedPath}.1.json`, // decoded path, depth 1
      `${cfPath}.json`, // default (no children)
    ];

    let data = null;
    let successUrl = null;

    // Try each endpoint
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

    // Parse children/items from the response
    let items = [];

    // AEM can return data in different formats
    if (Array.isArray(data)) {
      items = data;
      console.log('📋 資料是陣列，長度:', items.length);
    } else if (data && typeof data === 'object') {
      // Log all keys to see what's available
      const allKeys = Object.keys(data);
      console.log('🔍 檢查這些 keys:', allKeys);

      // Try to find children in various possible keys
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
            // Maybe it's nested deeper
            const nestedKeys = Object.keys(data[key]);
            console.log(`  ${key} 是物件，它的 keys:`, nestedKeys);
            // Check if any nested key contains an array
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
        // When using depth parameters (.1.json, .2.json), AEM returns child nodes
        // as direct properties of the parent object (not in a "children" array)
        // Filter for properties that look like content fragments
        // (exclude jcr: and sling: properties)
        console.log('⚠️ 沒找到標準的子項目 key');
        console.log('🔍 嘗試從物件屬性中提取子節點...');

        const childNodes = [];
        allKeys.forEach((key) => {
          // Skip JCR/Sling system properties
          if (key.startsWith('jcr:') || key.startsWith('sling:') || key.startsWith('rep:')) {
            console.log(`  ⏭️ 跳過系統屬性: ${key}`);
            return;
          }

          const value = data[key];
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            console.log(`  ✓ 找到可能的子節點: ${key}`, value);
            // Add the key as a property so we can track it
            childNodes.push({ ...value, _name: key });
          }
        });

        if (childNodes.length > 0) {
          items = childNodes;
          console.log(`📋 從物件屬性中提取出 ${childNodes.length} 個子節點`);
        } else {
          // Last resort: treat the whole object as single item
          console.log('⚠️ 完全沒找到子項目，將整個物件視為單一項目');
          console.log('📋 完整資料結構:', JSON.stringify(data, null, 2));
          items = [data];
        }
      }
    }

    console.log('🔍 總共找到', items.length, '個項目');

    // Filter and map to announcement format
    const announcements = items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        console.log('  處理項目:', item);
        console.log('    項目的 keys:', Object.keys(item));
        const nodeName = item._name || ''; // eslint-disable-line no-underscore-dangle
        console.log('    _name:', nodeName);

        // Content Fragment data is nested deep in jcr:content/data/master
        const jcrContent = item['jcr:content'];
        console.log('    jcr:content:', jcrContent);

        // Check if data exists at different levels
        let cfData = null;
        if (jcrContent) {
          console.log('    jcr:content keys:', Object.keys(jcrContent));

          // Try data.master first (most common for CF)
          if (jcrContent.data) {
            console.log('    jcr:content.data exists, keys:', Object.keys(jcrContent.data));
            if (jcrContent.data.master) {
              cfData = jcrContent.data.master;
              console.log('    ✓ 使用 data.master');
            } else {
              cfData = jcrContent.data;
              console.log('    ✓ 使用 data');
            }
          } else {
            // Fallback to jcr:content itself
            cfData = jcrContent;
            console.log('    ⚠️ data 不存在，使用 jcr:content');
          }
        }

        console.log('    CF data:', cfData);
        if (cfData) {
          console.log('    CF data keys:', Object.keys(cfData));
        }

        // Try different property name conventions
        const pathKey = 'jcr:path';
        const titleKey = 'jcr:title';
        const createdKey = 'jcr:created';
        const modifiedKey = 'jcr:lastModified';
        const undscorePath = '_path';

        // Try to get title from CF data first, then fallback to item properties
        const title = cfData?.noticeTitle
          || cfData?.title
          || cfData?.[titleKey]
          || item[titleKey]
          || item.title
          || item.noticeTitle
          || item.name
          || item['jcr:name']
          || nodeName // Use the node name we added
          || '';

        // Try to get date from CF data first
        const date = cfData?.noticeDate
          || cfData?.date
          || cfData?.published
          || item.noticeDate
          || item.date
          || item[modifiedKey]
          || item[createdKey]
          || item.published
          || '';

        // Try to get excerpt from CF data
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

        console.log('    -> title:', title, ', date:', date, ', path:', path);

        return {
          path,
          title: title.toString().trim(),
          date: date.toString().trim(),
          excerpt: excerpt.toString().trim(),
        };
      })
      .filter((item) => {
        const hasTitle = !!item.title;
        if (!hasTitle) {
          console.log('  ⚠️ 過濾掉沒有標題的項目:', item);
        }
        return hasTitle;
      }) // Only keep items with titles
      .sort((a, b) => {
        // Sort by date descending (newest first)
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });

    console.log('✅ 解析出', announcements.length, '個公告:', announcements);
    return announcements;
  } catch (err) {
    console.error('❌ fetchAnnouncements 錯誤:', err);
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
    console.log('⚠️ 沒有 data-aue-prop，使用 fallback 模式');

    // Try to find any links or content in the block
    const allLinks = block.querySelectorAll('a[href]');
    console.log('🔗 找到', allLinks.length, '個連結');
    allLinks.forEach((link, i) => {
      console.log(`  Link ${i}:`, link.href, link.textContent);
      if (!data.cfPath && link.href && link.href.includes('/content/')) {
        data.cfPath = extractCfPath(link);
        console.log('  ✅ 從連結提取 cfPath:', data.cfPath);
      }
    });

    // Also check all text content
    const allText = block.textContent;
    console.log('📝 Block 文字內容:', allText);
    if (!data.cfPath && allText.includes('/content/')) {
      const match = allText.match(/\/content\/[^\s"'<>]+/);
      if (match) {
        const matchedPath = match[0];
        data.cfPath = matchedPath;
        console.log('  ✅ 從文字提取 cfPath:', data.cfPath);
      }
    }

    const rows = [...block.children];
    console.log('📋 找到', rows.length, '個 rows');
    rows.forEach((row, i) => {
      console.log(`  Row ${i}:`, row);
      const cells = [...row.children];
      console.log(`    Cells (${cells.length}):`, cells);

      // Try to extract from single cell if available
      if (cells.length === 1) {
        const cell = cells[0];
        console.log('    Single cell HTML:', cell.innerHTML);
        const cellLinks = cell.querySelectorAll('a[href]');
        if (cellLinks.length > 0 && !data.cfPath) {
          data.cfPath = extractCfPath(cellLinks[0]);
          console.log('    ✅ 從 cell 連結提取 cfPath:', data.cfPath);
        }
      }

      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const valueCell = cells[1];
        console.log(`    Key: "${key}"`);
        console.log('    Value cell:', valueCell);
        console.log('    Value cell HTML:', valueCell.innerHTML);

        // Special handling for cfPath - it might be a link or urn
        if (key === 'cfPath' || key === 'CF Folder Path' || key.includes('公告資料夾')) {
          data.cfPath = extractCfPath(valueCell);
          console.log('  - cfPath (extracted):', data.cfPath);
        } else {
          const value = valueCell.textContent.trim();
          console.log('  -', key, ':', value);
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
