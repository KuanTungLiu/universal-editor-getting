/**
 * Banner Block for AEM Edge Delivery Services
 * Robust parsing for both table-based blocks and data-aue-prop authored content
 * - title uses textContent to avoid invalid HTML in <h1>
 * - subtitle keeps rich text via innerHTML
 * - supports nested data-aue-prop keys like "mainButtonSettings.mainButtonText"
 * - buttons render if text exists (buttonCount just overrides)
 */

export default function decorate(block) {
  const isEditor = block.hasAttribute('data-aue-resource');

  const norm = (v) => (typeof v === 'string' ? v.trim() : v);
  const lastKey = (k) => (k || '').split('.').pop();

  const firstUrlFromSrcset = (srcset) => {
    if (!srcset) return '';
    const first = srcset.split(',')[0]?.trim();
    return first ? first.split(' ')[0] : '';
  };

  const normalizeButtonCount = (raw) => {
    const v = String(raw || '').toLowerCase().trim();
    if (['none', '0', '', 'no', 'false'].includes(v)) return 'none';
    if (['main-only', 'main only', 'single', '1', 'one', 'primary'].includes(v)) return 'main-only';
    if (['main-and-sub', 'main and sub', 'double', '2', 'two', 'primary-secondary'].includes(v)) return 'main-and-sub';
    return 'none';
  };

  const data = {};

  // A) data-aue-prop authored
  const props = block.querySelectorAll('[data-aue-prop]');
  if (props.length > 0) {
    props.forEach((el) => {
      const rawKey = el.getAttribute('data-aue-prop');
      const key = lastKey(rawKey);
      if (!key) return;

      // Prefer picture
      const picture = el.querySelector('picture');
      if (picture) {
        data[key] = picture.cloneNode(true);
        const picImg = picture.querySelector('img');
        if (picImg?.getAttribute('alt')) data[`${key}Alt`] = picImg.getAttribute('alt');
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

      // Link
      const a = el.querySelector('a[href]');
      if (a && (key.toLowerCase().endsWith('link') || a.textContent.trim().length === 0)) {
        data[key] = a.getAttribute('href');
        return;
      }

      // Text/HTML
      const html = el.innerHTML.trim();
      const text = el.textContent.trim();

      // title: use plain text to avoid invalid markup inside <h1>
      if (key === 'title') {
        data[key] = text || html || '';
        return;
      }

      // subtitle is richtext
      if (key === 'subtitle') {
        data[key] = html || text || '';
        return;
      }

      data[key] = text || html || '';
    });

    // Editor: only enhance button visuals; don't wipe authored DOM
    if (isEditor) {
      const btnTextNodes = block.querySelectorAll('[data-aue-prop$="ButtonText"]');
      btnTextNodes.forEach((el) => {
        const text = el.textContent.trim();
        if (!text) return;
        let clickable = el.querySelector('a,button');
        if (!clickable) {
          clickable = document.createElement('button');
          clickable.type = 'button';
          el.innerHTML = '';
          el.appendChild(clickable);
        }
        clickable.classList.add('button', 'primary');
        clickable.textContent = text;
      });
      return;
    }
  } else {
    // B) table-authored fallback
    const rows = [...block.children];
    rows.forEach((row) => {
      const cells = [...row.children];
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const cell = cells[1];
        data[key] = cell.innerHTML.trim();

        if (key.toLowerCase().endsWith('buttonlink') || key.toLowerCase().endsWith('link')) {
          const link = cell.querySelector('a[href]');
          if (link) data[key] = link.getAttribute('href');
        }
      }
    });

    // Editor enhancement for table mode
    if (isEditor) {
      const buttonRows = rows.filter((row) => row.children?.[0]?.textContent?.trim().toLowerCase().endsWith('buttontext'));
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

  // Runtime render
  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // Image as sibling of content (matches your CSS)
  if (data.image) {
    if (data.image instanceof Node) {
      const node = data.image.cloneNode(true);
      node.classList?.add?.('banner-image');
      const innerImg = node.querySelector?.('img');
      if (innerImg) innerImg.classList.add('banner-image');
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

  // Title: text only into <h1> to avoid invalid nested markup
  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.textContent = norm(data.title);
    content.appendChild(titleEl);
  }

  // Subtitle: rich text allowed
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.innerHTML = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // Buttons (render if text exists; buttonCount only overrides)
  const hasMainText = !!norm(data.mainButtonText);
  const hasSubText = !!norm(data.subButtonText);

  let mode = normalizeButtonCount(data.buttonCount);
  if (mode === 'none') {
    if (hasMainText && hasSubText) mode = 'main-and-sub';
    else if (hasMainText) mode = 'main-only';
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
    try {
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    } catch { /* ignore */ }

    wrapper.appendChild(a);
    return wrapper;
  };

  if (mode !== 'none') {
    const btnBox = document.createElement('div');
    btnBox.className = 'banner-buttons';

    if (mode === 'main-only' || mode === 'main-and-sub') {
      const mainBtn = createButton(
        data.mainButtonText,
        data.mainButtonLink,
        (String(data.mainButtonType || 'primary').toLowerCase().includes('secondary') ? 'secondary' : 'primary'),
      );
      if (mainBtn) btnBox.appendChild(mainBtn);
    }

    if (mode === 'main-and-sub') {
      const subBtn = createButton(
        data.subButtonText,
        data.subButtonLink,
        (String(data.subButtonType || 'secondary').toLowerCase().includes('primary') ? 'primary' : 'secondary'),
      );
      if (subBtn) btnBox.appendChild(subBtn);
    }

    if (btnBox.children.length > 0) content.appendChild(btnBox);
  }

  container.appendChild(content);
  block.appendChild(container);
}
