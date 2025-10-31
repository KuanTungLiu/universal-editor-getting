export default function decorate(block) {
  const isEditor = block.hasAttribute('data-aue-resource');

  const norm = (v) => (typeof v === 'string' ? v.trim() : v);

  const data = {};

  // Parse data-aue-prop authored content
  const props = block.querySelectorAll('[data-aue-prop]');
  if (props.length > 0) {
    props.forEach((el) => {
      const fullKey = el.getAttribute('data-aue-prop');
      // eslint-disable-next-line no-console
      console.log('Processing prop:', fullKey, el);

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
      // Support both cases: data-aue-prop on <img> itself or on a wrapper containing <img>
      let imageInWrapper = null;
      if (imageWrapper) {
        if (imageWrapper.tagName === 'IMG') {
          imageInWrapper = imageWrapper;
        } else {
          imageInWrapper = imageWrapper.querySelector('img');
        }
      }
      const buttonCountEl = block.querySelector('[data-aue-prop="buttonCount"]');

      // Values from DOM when available for fidelity
      const titleText = titleEl ? titleEl.textContent.trim() : data.title || '';
      const subtitleHtml = subtitleEl ? subtitleEl.innerHTML : '';
      const imgSrc = imageInWrapper ? imageInWrapper.getAttribute('src') : (data.image || '');
      const buttonCountVal = buttonCountEl ? buttonCountEl.textContent.trim().toLowerCase() : (data.buttonCount || '').toLowerCase();

      // Hide raw authored fields so preview doesn't duplicate
      [titleEl, subtitleEl, imageWrapper, buttonCountEl].forEach((el) => {
        if (el) el.style.display = 'none';
      });

      // Build preview container similar to runtime
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

      // Buttons preview
      const mainTextEl = block.querySelector('[data-aue-prop="mainButtonText"]');
      const subTextEl = block.querySelector('[data-aue-prop="subButtonText"]');
      const mainLinkEl = block.querySelector('[data-aue-prop="mainButtonLink"] a');
      const subLinkEl = block.querySelector('[data-aue-prop="subButtonLink"] a');

      const mainText = mainTextEl ? mainTextEl.textContent.trim() : '';
      const subText = subTextEl ? subTextEl.textContent.trim() : '';
      const mainHref = mainLinkEl ? mainLinkEl.getAttribute('href') : '#';
      const subHref = subLinkEl ? subLinkEl.getAttribute('href') : '#';

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

      // Image on the RIGHT in editor preview
      container.appendChild(content);
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = data.imageAlt || '';
        img.className = 'banner-image';
        container.appendChild(img);
      }

      // Append preview
      block.appendChild(container);
      return;
    }
  } else {
    // Fallback: parse table-based rows
    const rows = [...block.children];
    rows.forEach((row) => {
      const cells = [...row.children];
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const cell = cells[1];
        data[key] = cell.innerHTML.trim();

        // Extract link href if present
        if (key.toLowerCase().includes('link')) {
          const link = cell.querySelector('a[href]');
          if (link) data[key] = link.getAttribute('href');
        }

        // Extract image src if present
        if (key.toLowerCase().includes('image')) {
          const img = cell.querySelector('img');
          if (img && img.getAttribute('src')) data[key] = img.getAttribute('src');
        }
      }
    });

    // Editor mode: enhance buttons in table mode
    if (isEditor) {
      rows.forEach((row) => {
        if (!row.children[0]) return;
        const key = row.children[0].textContent.trim().toLowerCase();
        if (key.includes('buttontext') && row.children[1]) {
          const text = row.children[1].textContent.trim();
          if (text) {
            const btn = document.createElement('button');
            btn.className = 'button primary';
            btn.type = 'button';
            btn.textContent = text;
            row.children[1].innerHTML = '';
            row.children[1].appendChild(btn);
          }
        }
      });
      return;
    }
  }

  // Runtime render: build DOM from parsed data
  // DEBUG: Log parsed data
  // eslint-disable-next-line no-console
  console.log('Banner data parsed:', data);
  // eslint-disable-next-line no-console
  console.log('Button count:', data.buttonCount);

  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // Prepare image (append after content so it appears on the right in flex row)
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
    subtitleEl.innerHTML = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // Add buttons
  const buttonCount = (data.buttonCount || '').toLowerCase().trim();
  const hasMainText = !!(data.mainButtonText || '').trim();
  const hasSubText = !!(data.subButtonText || '').trim();

  // eslint-disable-next-line no-console
  console.log('Button logic:', { buttonCount, hasMainText, hasSubText });

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
      if (!t || !l) return null;

      const wrapper = document.createElement('div');
      wrapper.className = 'button-wrapper';

      const a = document.createElement('a');
      a.className = `button ${type}`;
      a.href = l;
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
