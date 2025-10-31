export default function decorate(block) {
  const data = {};
  const props = block.querySelectorAll('[data-aue-prop]');

  // read properties robustly: prefer link href, then img src, then textContent, then innerHTML
  props.forEach((el) => {
    const key = el.getAttribute('data-aue-prop');
    const anchor = el.querySelector('a');
    const img = el.querySelector('img');
    const text = el.textContent.trim();
    const html = el.innerHTML.trim();
    if (anchor && anchor.getAttribute('href')) {
      data[key] = anchor.getAttribute('href');
    } else if (img && img.getAttribute('src')) {
      data[key] = img.getAttribute('src');
    } else if (text) {
      data[key] = text;
    } else {
      data[key] = html;
    }
  });

  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  if (data.image) {
    const imgEl = document.createElement('img');
    imgEl.src = data.image;
    imgEl.alt = data.imageAlt || '';
    imgEl.className = 'banner-image';
    content.appendChild(imgEl);
  }

  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.textContent = data.title;
    content.appendChild(titleEl);
  }

  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.textContent = data.subtitle;
    content.appendChild(subtitleEl);
  }

  const buttonCount = data.buttonCount || 'none';
  if (buttonCount !== 'none') {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'banner-buttons';

    const createButton = (text, link, type = 'primary') => {
      if (!text) return null;
      const wrapper = document.createElement('div');
      wrapper.className = 'button-wrapper';

      const button = document.createElement('a');
      button.className = `button ${type}`;
      button.href = link || '#'; // 如果 link 沒有值，先給 #
      button.textContent = text;

      wrapper.appendChild(button);
      return wrapper;
    };

    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createButton(data.mainButtonText, data.mainButtonLink, 'primary');
      if (mainBtn) buttonContainer.appendChild(mainBtn);
    }

    if (buttonCount === 'main-and-sub') {
      const subBtn = createButton(data.subButtonText, data.subButtonLink, 'secondary');
      if (subBtn) buttonContainer.appendChild(subBtn);
    }

    if (buttonContainer.children.length > 0) content.appendChild(buttonContainer);
  }

  container.appendChild(content);
  block.appendChild(container);
}
