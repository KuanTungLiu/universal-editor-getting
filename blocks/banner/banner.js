/**
 * Banner Block for AEM Edge Delivery Services
 * Supports dynamic button rendering based on buttonCount selection
 */

export default function decorate(block) {
  // 1. 解析 block 裡的 data-aue-prop
  const data = {};
  const props = block.querySelectorAll('[data-aue-prop]');

  props.forEach((el) => {
    const key = el.getAttribute('data-aue-prop');
    const anchor = el.querySelector('a'); // 如果有 <a>，用 href
    data[key] = anchor ? anchor.getAttribute('href') : el.textContent.trim();
  });

  // 2. 清空 block
  block.innerHTML = '';

  // 3. 建立 container 結構
  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // 4. 加入圖片（放在 content 裡）
  if (data.image) {
    const imgEl = document.createElement('img');
    imgEl.src = data.image;
    imgEl.alt = data.imageAlt || '';
    imgEl.className = 'banner-image';
    content.appendChild(imgEl);
  }

  // 5. 加入標題
  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.innerHTML = data.title;
    content.appendChild(titleEl);
  }

  // 6. 加入副標題
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.innerHTML = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // 7. 處理按鈕
  const buttonCount = data.buttonCount || 'none';
  if (buttonCount !== 'none') {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'banner-buttons';

    const createButton = (text, link, type = 'primary') => {
      if (!text || !link) return null;

      const wrapper = document.createElement('div');
      wrapper.className = 'button-wrapper';

      const button = document.createElement('a');
      button.className = `button ${type}`;
      button.href = link;
      button.textContent = text;

      wrapper.appendChild(button);
      return wrapper;
    };

    // main button
    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createButton(data.mainButtonText, data.mainButtonLink, 'primary');
      if (mainBtn) buttonContainer.appendChild(mainBtn);
    }

    // sub button
    if (buttonCount === 'main-and-sub') {
      const subBtn = createButton(data.subButtonText, data.subButtonLink, 'secondary');
      if (subBtn) buttonContainer.appendChild(subBtn);
    }

    if (buttonContainer.children.length > 0) {
      content.appendChild(buttonContainer);
    }
  }

  // 8. 將 content 加到 container
  container.appendChild(content);

  // 9. 將 container 加回 block
  block.appendChild(container);
}
