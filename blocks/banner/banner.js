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
    const anchor = el.querySelector('a'); // 優先抓 <a> href
    const img = el.querySelector('img'); // 再抓 <img> src
    const text = el.textContent.trim(); // 再抓文字
    const html = el.innerHTML.trim(); // 最後抓 innerHTML

    if (img && img.getAttribute('src')) {
      data[key] = img.getAttribute('src');
      return; // 找到圖片就結束該元素的解析
    }

    // 1.2 接著處理連結 (<a> href)
    if (anchor && anchor.getAttribute('href')) {
      data[key] = anchor.getAttribute('href');
      return; // 找到連結就結束
    }

    // 1.3 最後處理純文字或 HTML
    if (text) {
      data[key] = text;
    } else {
      data[key] = html;
    }
  });

  // 2. 清空 block
  block.innerHTML = '';

  // 3. 建立 container
  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // 4. 加入圖片
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
    titleEl.textContent = data.title;
    content.appendChild(titleEl);
  }

  // 6. 加入副標題
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.textContent = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // 7. 處理按鈕
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
      button.href = link || '#'; // link 沒抓到就用 #
      button.textContent = text;
      wrapper.appendChild(button);
      return wrapper;
    };

    // 主按鈕
    if ((buttonCount === 'main-only' || buttonCount === 'main-and-sub') && data.mainButtonText) {
      const mainBtn = createButton(data.mainButtonText, data.mainButtonLink, 'primary');
      if (mainBtn) buttonContainer.appendChild(mainBtn);
    }

    // 次按鈕
    if (buttonCount === 'main-and-sub' && data.subButtonText) {
      const subBtn = createButton(data.subButtonText, data.subButtonLink, 'secondary');
      if (subBtn) buttonContainer.appendChild(subBtn);
    }

    if (buttonContainer.children.length > 0) content.appendChild(buttonContainer);
  }

  container.appendChild(content);
  block.appendChild(container);
}
