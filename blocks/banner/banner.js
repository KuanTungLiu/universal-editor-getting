/**
 * Banner Block for AEM Edge Delivery Services
 * Supports dynamic button rendering based on buttonCount selection
 * Robust parsing for both table-based blocks and data-aue-prop authored content
 */

export default function decorate(block) {
  const isEditor = block.hasAttribute('data-aue-resource');

  // Helpers
  const norm = (v) => (typeof v === 'string' ? v.trim() : v);

  const normalizeButtonCount = (raw) => {
    const v = String(raw || '').toLowerCase().trim();
    if (['none', '0', '', 'no', 'false'].includes(v)) return 'none';
    if (['main-only', 'main only', 'single', '1', 'one', 'primary'].includes(v)) return 'main-only';
    if (['main-and-sub', 'main and sub', 'double', '2', 'two', 'primary-secondary'].includes(v)) return 'main-and-sub';
    return 'none';
  };

  const inferButtonCountFromData = (data) => {
    const hasMain = !!(data.mainButtonText || data.mainButtonLink);
    const hasSub = !!(data.subButtonText || data.subButtonLink);
    if (hasMain && hasSub) return 'main-and-sub';
    if (hasMain) return 'main-only';
    return 'none';
  };

  const firstUrlFromSrcset = (srcset) => {
    if (!srcset) return '';
    const first = srcset.split(',')[0]?.trim();
    return first ? first.split(' ')[0] : '';
  };

  // Data object to collect authored values
  const data = {};

  // Strategy A: parse data-aue-prop authored content
  const props = block.querySelectorAll('[data-aue-prop]');
  if (props.length > 0) {
    props.forEach((el) => {
      const key = el.getAttribute('data-aue-prop');
      if (!key) return;

      // Prefer picture if present
      const picture = el.querySelector('picture');
      if (picture) {
        data[key] = picture.cloneNode(true);
        // take alt if possible
        const picImg = picture.querySelector('img');
        if (picImg?.getAttribute('alt')) {
          data[`${key}Alt`] = picImg.getAttribute('alt');
        }
        return;
      }

      // Then img (src or data-src)
      const img = el.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src) {
          data[key] = { src, alt: img.getAttribute('alt') || '' };
          return;
        }
      }

      // Then source srcset
      const source = el.querySelector('source');
      if (source?.getAttribute('srcset')) {
        const src = firstUrlFromSrcset(source.getAttribute('srcset'));
        if (src) {
          data[key] = { src, alt: '' };
          return;
        }
      }

      // Then anchor href (for *Link fields)
      const a = el.querySelector('a[href]');
      if (a && (key.toLowerCase().endsWith('link') || a.textContent.trim().length === 0)) {
        data[key] = a.getAttribute('href');
        return;
      }

      // Prefer innerHTML for rich fields, text for plain
      const html = el.innerHTML.trim();
      const text = el.textContent.trim();
      // For title/subtitle prefer HTML to keep formatting
      if (['title', 'subtitle'].includes(key)) {
        data[key] = html || text || '';
      } else {
        data[key] = text || html || '';
      }
    });
  } else {
    // Strategy B: parse table rows (two-column)
    const rows = [...block.children];
    rows.forEach((row) => {
      const cells = [...row.children];
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const cell = cells[1];
        const value = cell.innerHTML.trim();
        data[key] = value;

        // Special handling for links
        if (key.toLowerCase().endsWith('buttonlink') || key.toLowerCase().endsWith('link')) {
          const link = cell.querySelector('a[href]');
          if (link) data[key] = link.getAttribute('href');
        }
      }
    });

    // Editor enhancement for table mode: render buttons visually without clearing DOM
    if (isEditor) {
      const buttonRows = rows.filter((row) => {
        const key = row.children?.[0]?.textContent?.trim() || '';
        return key.toLowerCase().endsWith('buttontext');
      });
      buttonRows.forEach((row) => {
        const btnCell = row.children?.[1];
        if (!btnCell) return;
        const text = btnCell.textContent.trim();
        if (text) {
          const btn = document.createElement('button');
          btn.className = 'button primary';
          btn.type = 'button';
          btn.textContent = text;
          btnCell.innerHTML = '';
          btnCell.appendChild(btn);
        }
      });
      return;
    }
  }

  // Editor enhancement for data-aue-prop mode: do not rebuild, just enhance button visuals
  if (isEditor && props.length > 0) {
    const buttonTextEls = block.querySelectorAll('[data-aue-prop$="ButtonText"]');
    buttonTextEls.forEach((el) => {
      const text = el.textContent.trim();
      if (!text) return;
      // If an anchor exists, style it. Else create a button element so it's visible.
      let clickable = el.querySelector('a');
      if (!clickable) {
        clickable = document.createElement('button');
        clickable.type = 'button';
        clickable.textContent = text;
        el.innerHTML = '';
        el.appendChild(clickable);
      } else {
        clickable.textContent = text;
      }
      clickable.classList.add('button', 'primary');
    });
    return;
  }

  // Runtime render: rebuild DOM
  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // Image: keep same structure as working version -> child of container (sibling to content)
  if (data.image) {
    if (data.image instanceof Node) {
      const node = data.image.cloneNode(true);
      node.classList?.add?.('banner-image');
      const imgInPic = node.querySelector?.('img');
      if (imgInPic) imgInPic.classList.add('banner-image');
      container.appendChild(node);
    } else if (typeof data.image === 'object' && data.image.src) {
      const imgEl = document.createElement('img');
      imgEl.src = data.image.src;
      imgEl.alt = data.image.alt || data.imageAlt || '';
      imgEl.className = 'banner-image';
      container.appendChild(imgEl);
    } else if (typeof data.image === 'string') {
      const imgEl = document.createElement('img');
      imgEl.src = data.image;
      imgEl.alt = data.imageAlt || '';
      imgEl.className = 'banner-image';
      container.appendChild(imgEl);
    }
  }

  // Title
  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    // data.title may be HTML (from props) or plain text (from table)
    titleEl.innerHTML = data.title;
    content.appendChild(titleEl);
  }

  // Subtitle
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.innerHTML = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // Buttons
  let buttonCount = normalizeButtonCount(data.buttonCount);
  if (buttonCount === 'none') {
    // Infer if not set
    buttonCount = inferButtonCountFromData(data);
  }

  const createButton = (text, link, type = 'primary') => {
    const t = norm(text);
    if (!t) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'button-wrapper';

    const a = document.createElement('a');
    a.className = `button ${type}`;
    a.href = norm(link) || '#';
    a.textContent = t;

    // Optional: open external links safely
    try {
      const url = new URL(a.href, window.location.href);
      const isExternal = url.origin !== window.location.origin;
      if (isExternal) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    } catch {
      // ignore URL parsing errors (e.g., just "#")
    }

    wrapper.appendChild(a);
    return wrapper;
  };

  if (buttonCount !== 'none') {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'banner-buttons';

    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainType = (data.mainButtonType || 'primary').toLowerCase().includes('secondary')
        ? 'secondary'
        : 'primary';
      const mainBtn = createButton(data.mainButtonText, data.mainButtonLink, mainType);
      if (mainBtn) buttonContainer.appendChild(mainBtn);
    }

    if (buttonCount === 'main-and-sub') {
      const subType = (data.subButtonType || 'secondary').toLowerCase().includes('primary')
        ? 'primary'
        : 'secondary';
      const subBtn = createButton(data.subButtonText, data.subButtonLink, subType);
      if (subBtn) buttonContainer.appendChild(subBtn);
    }

    if (buttonContainer.children.length > 0) {
      content.appendChild(buttonContainer);
    }
  }

  container.appendChild(content);
  block.appendChild(container);
}
