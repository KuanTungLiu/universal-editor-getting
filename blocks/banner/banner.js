export default function decorate(block) {
  const isEditor = block.hasAttribute('data-aue-resource');

  const norm = (v) => (typeof v === 'string' ? v.trim() : v);

  const data = {};

  // Parse data-aue-prop authored content
  const props = block.querySelectorAll('[data-aue-prop]');
  if (props.length > 0) {
    props.forEach((el) => {
      const fullKey = el.getAttribute('data-aue-prop');

      // Check for image
      const img = el.querySelector('img');
      if (img && img.getAttribute('src')) {
        data[fullKey] = img.getAttribute('src');
        return;
      }

      // Check for link
      const a = el.querySelector('a[href]');
      if (a) {
        data[fullKey] = a.getAttribute('href');
        return;
      }

      // Text content
      const text = el.textContent.trim();
      data[fullKey] = text;
    });

    // Editor mode: build a non-destructive preview with proper layout
    if (isEditor) {
      const titleEl = block.querySelector('[data-aue-prop="title"]');
      const subtitleEl = block.querySelector('[data-aue-prop="subtitle"]');
      const imageWrapper = block.querySelector('[data-aue-prop="image"]');
      let imageInWrapper = null;
      if (imageWrapper) {
        if (imageWrapper.tagName === 'IMG') {
          imageInWrapper = imageWrapper;
        } else {
          imageInWrapper = imageWrapper.querySelector('img');
        }
      }
      const buttonCountEl = block.querySelector('[data-aue-prop="buttonCount"]');

      const titleText = titleEl ? titleEl.textContent.trim() : data.title || '';
      // 只取 richtext 本身的內容，不包含其他欄位
      let subtitleHtml = '';
      if (subtitleEl) {
        // 只取 data-aue-prop="subtitle" 元素本身的直接內容
        // 避免抓到其他 data-aue-prop 欄位
        const clone = subtitleEl.cloneNode(true);
        // 移除所有帶有 data-aue-prop 的子元素（這些是其他欄位）
        const nestedProps = clone.querySelectorAll('[data-aue-prop]');
        nestedProps.forEach((el) => el.remove());
        subtitleHtml = clone.innerHTML;
      }
      const imgSrc = imageInWrapper ? imageInWrapper.getAttribute('src') : (data.image || '');
      const buttonCountVal = buttonCountEl ? buttonCountEl.textContent.trim().toLowerCase() : (data.buttonCount || '').toLowerCase();

      [titleEl, subtitleEl, imageWrapper, buttonCountEl].forEach((el) => {
        if (el) el.style.display = 'none';
      });

      const container = document.createElement('div');
      container.className = 'banner-container';

      const content = document.createElement('div');
      content.className = 'banner-content';

      if (titleText) {
        const t = document.createElement('h1');
        t.className = 'banner-title';
        t.textContent = titleText;
        content.appendChild(t);
      }

      if (subtitleHtml) {
        const s = document.createElement('div');
        s.className = 'banner-subtitle';
        s.innerHTML = subtitleHtml;
        content.appendChild(s);
      }

      // 按鈕欄位在 mainButtonSettings 和 subButtonSettings 容器內
      const mainSettings = block.querySelector('[data-aue-prop="mainButtonSettings"]');
      const subSettings = block.querySelector('[data-aue-prop="subButtonSettings"]');

      let mainTextEl = null;
      let mainLinkEl = null;
      let subTextEl = null;
      let subLinkEl = null;

      if (mainSettings) {
        mainTextEl = mainSettings.querySelector('[data-aue-prop="mainButtonText"]');
        const mainLinkWrapper = mainSettings.querySelector('[data-aue-prop="mainButtonLink"]');
        if (mainLinkWrapper) {
          mainLinkEl = mainLinkWrapper.querySelector('a');
        }
      }

      if (subSettings) {
        subTextEl = subSettings.querySelector('[data-aue-prop="subButtonText"]');
        const subLinkWrapper = subSettings.querySelector('[data-aue-prop="subButtonLink"]');
        if (subLinkWrapper) {
          subLinkEl = subLinkWrapper.querySelector('a');
        }
      }

      const mainText = mainTextEl ? mainTextEl.textContent.trim() : '';
      const subText = subTextEl ? subTextEl.textContent.trim() : '';
      const mainHref = mainLinkEl ? mainLinkEl.getAttribute('href') : '#';
      const subHref = subLinkEl ? subLinkEl.getAttribute('href') : '#';

      // Hide button-related fields in editor mode - use !important to ensure hiding
      const hideElement = (el) => {
        if (!el) return;
        el.style.setProperty('display', 'none', 'important');
        // Also hide all child elements
        const children = el.querySelectorAll('*');
        children.forEach((child) => {
          child.style.setProperty('display', 'none', 'important');
        });
      };

      // Hide the entire mainButtonSettings and subButtonSettings containers
      // This will hide all fields inside them (text and link)
      if (mainSettings) hideElement(mainSettings);
      if (subSettings) hideElement(subSettings);

      const btnContainer = document.createElement('div');
      btnContainer.className = 'banner-buttons';

      const makeBtn = (txt, href, type) => {
        if (!txt) return null;
        const wrap = document.createElement('div');
        wrap.className = 'button-wrapper';
        const a = document.createElement('a');
        a.className = `button ${type}`;
        a.href = href || '#';
        a.textContent = txt;
        wrap.appendChild(a);
        return wrap;
      };

      if (buttonCountVal === 'main-only' || buttonCountVal === 'main-and-sub') {
        const mb = makeBtn(mainText || '重要公告', mainHref, 'primary');
        if (mb) btnContainer.appendChild(mb);
      }
      if (buttonCountVal === 'main-and-sub') {
        const sb = makeBtn(subText || '新聞直播', subHref, 'secondary');
        if (sb) btnContainer.appendChild(sb);
      }
      if (btnContainer.children.length > 0) content.appendChild(btnContainer);

      container.appendChild(content);
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = data.imageAlt || '';
        img.className = 'banner-image';
        container.appendChild(img);
      }

      block.appendChild(container);
      return;
    }
  } else {
    // ====== 根據實際 HTML 結構解析 ======
    const rows = [...block.children];

    if (rows.length >= 1 && rows[0].children[0]) {
      // 第1行：title
      const titleCell = rows[0].children[0];
      const titleP = titleCell.querySelector('p');
      if (titleP) {
        data.title = titleP.textContent.trim();
      }
    }

    if (rows.length >= 2 && rows[1].children[0]) {
      // 第2行：subtitle
      const subtitleCell = rows[1].children[0];
      const subtitleP = subtitleCell.querySelector('p');
      if (subtitleP) {
        data.subtitle = subtitleP.textContent.trim();
      }
    }

    if (rows.length >= 3 && rows[2].children[0]) {
      // 第3行：image
      const imageCell = rows[2].children[0];
      const img = imageCell.querySelector('img');
      if (img && img.getAttribute('src')) {
        data.image = img.getAttribute('src');
        data.imageAlt = img.getAttribute('alt') || '';
      }
    }

    if (rows.length >= 4 && rows[3].children[0]) {
      // 第4行：buttonCount
      const buttonCountCell = rows[3].children[0];
      const buttonCountP = buttonCountCell.querySelector('p');
      if (buttonCountP) {
        data.buttonCount = buttonCountP.textContent.trim();
      }
    }

    if (rows.length >= 5 && rows[4].children[0]) {
      // 第5行：mainButtonText
      const mainTextCell = rows[4].children[0];
      const mainTextP = mainTextCell.querySelector('p');
      if (mainTextP) {
        data.mainButtonText = mainTextP.textContent.trim();
      }
      const mainLink = mainTextCell.querySelector('a[href]');
      if (mainLink) {
        data.mainButtonLink = mainLink.getAttribute('href');
        if (!data.mainButtonText) {
          data.mainButtonText = mainLink.textContent.trim();
        }
      }
    }

    if (rows.length >= 6 && rows[5].children[0]) {
      // 第6行：subButtonText
      const subTextCell = rows[5].children[0];
      const subTextP = subTextCell.querySelector('p');
      if (subTextP) {
        data.subButtonText = subTextP.textContent.trim();
      }
      const subLink = subTextCell.querySelector('a[href]');
      if (subLink) {
        data.subButtonLink = subLink.getAttribute('href');
        if (!data.subButtonText) {
          data.subButtonText = subLink.textContent.trim();
        }
      }
    }

    // ====== 🎯 新增：設定預設值 ======
    // 如果 buttonCount 是空的，預設顯示兩個按鈕
    if (!data.buttonCount) {
      data.buttonCount = 'main-and-sub';
    }

    // 如果 subtitle 是空的，給預設文字
    if (!data.subtitle) {
      data.subtitle = '時時掌握交易資訊，絕不漏接重要新聞，大事小事通通報你知！';
    }

    // 如果按鈕文字是空的，給預設文字
    if (!data.mainButtonText) {
      data.mainButtonText = '重要公告';
    }
    if (!data.subButtonText) {
      data.subButtonText = '新聞直播';
    }

    // 如果按鈕連結是空的，給預設連結
    if (!data.mainButtonLink) {
      data.mainButtonLink = '#';
    }
    if (!data.subButtonLink) {
      data.subButtonLink = '#';
    }
    // parsed fallback data available in `data`
    // Editor mode: enhance buttons in table mode
    if (isEditor) {
      rows.forEach((row) => {
        if (!row.children[0]) return;
        const cell = row.children[0];
        const p = cell.querySelector('p');
        if (p) {
          const text = p.textContent.trim().toLowerCase();
          // Check if this is a button row (for future enhancements)
          if (text.includes('button') || text === 'main-and-sub' || text === 'main-only') {
            // Button row detected - no additional processing needed in editor mode
          }
        }
      });
      return;
    }
  }

  // Runtime render: build DOM from parsed data
  // build banner from parsed `data`

  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // Prepare image
  let imgEl;
  if (data.image) {
    imgEl = document.createElement('img');
    imgEl.src = data.image;
    imgEl.alt = data.imageAlt || '';
    imgEl.className = 'banner-image';
  }

  // Add title
  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.textContent = norm(data.title);
    content.appendChild(titleEl);
  }

  // Add subtitle
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.textContent = norm(data.subtitle);
    content.appendChild(subtitleEl);
  }

  // Add buttons
  const buttonCount = (data.buttonCount || '').toLowerCase().trim();
  const hasMainText = !!(data.mainButtonText || '').trim();
  const hasSubText = !!(data.subButtonText || '').trim();

  // compute whether to render buttons based on provided values

  let shouldShowButtons = false;
  if (buttonCount === 'main-only' && hasMainText) shouldShowButtons = true;
  if (buttonCount === 'main-and-sub' && (hasMainText || hasSubText)) {
    shouldShowButtons = true;
  }

  if (shouldShowButtons) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'banner-buttons';

    const createBtn = (text, link, type = 'primary') => {
      const t = norm(text);
      const l = norm(link);
      if (!t) return null;

      const wrapper = document.createElement('div');
      wrapper.className = 'button-wrapper';

      const a = document.createElement('a');
      a.className = `button ${type}`;
      a.href = l || '#';
      a.textContent = t;
      wrapper.appendChild(a);
      return wrapper;
    };

    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createBtn(
        data.mainButtonText,
        data.mainButtonLink,
        'primary',
      );
      if (mainBtn) btnContainer.appendChild(mainBtn);
    }

    if (buttonCount === 'main-and-sub') {
      const subBtn = createBtn(
        data.subButtonText,
        data.subButtonLink,
        'secondary',
      );
      if (subBtn) btnContainer.appendChild(subBtn);
    }

    if (btnContainer.children.length > 0) {
      content.appendChild(btnContainer);
    }
  }

  container.appendChild(content);
  if (imgEl) container.appendChild(imgEl);
  block.appendChild(container);
}
