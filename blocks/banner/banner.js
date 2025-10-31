export default function decorate(block) {
  const data = {};

  // 🔹 支援 AEM Universal Editor 格式
  const props = block.querySelectorAll('[data-aue-prop]');
  props.forEach((el) => {
    const key = el.getAttribute('data-aue-prop');
    const link = el.querySelector('a');
    data[key] = link ? link.getAttribute('href') : el.textContent.trim();
  });

  // 🔹 清空舊內容
  block.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'banner-container';
  const content = document.createElement('div');
  content.className = 'banner-content';

  // 🔹 Title
  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.innerHTML = data.title;
    content.appendChild(titleEl);
  }

  // 🔹 Subtitle
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.innerHTML = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // 🔹 Image
  if (data.image) {
    const imgEl = document.createElement('img');
    imgEl.src = data.image;
    imgEl.alt = data.imageAlt || '';
    imgEl.className = 'banner-image';
    container.appendChild(imgEl);
  }

  // 🔹 Buttons
  const buttonCount = data.buttonCount || 'none';
  if (buttonCount !== 'none') {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'banner-buttons';

    const createButton = (text, link, type = 'primary') => {
      if (!text || !link) return null;
      const a = document.createElement('a');
      a.className = `button ${type}`;
      a.href = link;
      a.textContent = text;
      return a;
    };

    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createButton(data.mainButtonText, data.mainButtonLink, 'primary');
      if (mainBtn) buttonContainer.appendChild(mainBtn);
    }

    if (buttonCount === 'main-and-sub') {
      const subBtn = createButton(data.subButtonText, data.subButtonLink, 'secondary');
      if (subBtn) buttonContainer.appendChild(subBtn);
    }

    if (buttonContainer.children.length > 0) {
      content.appendChild(buttonContainer);
    }
  }

  container.appendChild(content);
  block.appendChild(container);
}
