/**
 * Banner Block for AEM Edge Delivery Services
 * Supports dynamic button rendering based on buttonCount selection
 */

function createButton(text, link, title, isPrimary = true) {
  // 確保至少有文字
  if (!text) return null;

  const button = document.createElement('a');
  button.className = `btn ${isPrimary ? 'btn-primary' : 'btn-secondary'}`;
  
  // 如果有連結就加入，沒有就使用 # 作為預設
  button.href = link || '#';
  button.textContent = text;
  
  if (title) {
    button.title = title;
  }
  
  // 如果沒有真實連結，防止點擊行為
  if (!link) {
    button.addEventListener('click', (e) => e.preventDefault());
  }
  
  return button;
}

export default function decorate(block) {
  // If in editor mode, don't modify structure
  if (block.hasAttribute('data-aue-resource')) {
    return;
  }

  // Parse block content
  const rows = [...block.children];
  const data = {};

  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim();
      // 檢查是否包含連結
      const links = cells[1].querySelectorAll('a');
      if (key.includes('ButtonText')) {
        data[key] = cells[1].textContent.trim();
      } else if (key.includes('ButtonLink')) {
        data[key] = cells[1].querySelector('a')?.getAttribute('href') || '';
      } else {
        data[key] = cells[1].textContent.trim() || cells[1].innerHTML.trim();
      }
    }
  });

  // Extract values
  const title = data.title || '';
  const subtitle = data.subtitle || '';
  const image = data.image || '';
  const imageAlt = data.imageAlt || '';
  const buttonCount = data.buttonCount || 'none';

  // Main button
  const mainButtonText = data.mainButtonText || '';
  const mainButtonLink = data.mainButtonLink || '';
  const mainButtonLinkTitle = data.mainButtonLinkTitle || '';

  // Sub button
  const subButtonText = data.subButtonText || '';
  const subButtonLink = data.subButtonLink || '';
  const subButtonLinkTitle = data.subButtonLinkTitle || '';

  // Clear and rebuild
  block.innerHTML = '';

  // Container
  const container = document.createElement('div');
  container.className = 'banner-container';

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'banner-content';

  // Image (background or foreground)
  if (image) {
    const imgEl = document.createElement('img');
    imgEl.src = image;
    imgEl.alt = imageAlt;
    imgEl.className = 'banner-image';
    container.appendChild(imgEl);
  }

  // Title
  if (title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.textContent = title;
    content.appendChild(titleEl);
  }

  // Subtitle
  if (subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.innerHTML = subtitle;
    content.appendChild(subtitleEl);
  }

  // Buttons based on buttonCount
  if (buttonCount !== 'none') {
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'banner-buttons';

    // Main button
    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      // 只要有按鈕文字就建立按鈕
      if (mainButtonText) {
        const mainBtn = createButton(mainButtonText, mainButtonLink, mainButtonLinkTitle, true);
        if (mainBtn) {
          buttonWrapper.appendChild(mainBtn);
        }
      }
    }

    // Sub button
    if (buttonCount === 'main-and-sub') {
      // 只要有按鈕文字就建立按鈕
      if (subButtonText) {
        const subBtn = createButton(subButtonText, subButtonLink, subButtonLinkTitle, false);
        if (subBtn) {
          buttonWrapper.appendChild(subBtn);
        }
      }
    }

    // Only add button wrapper if it has buttons
    if (buttonWrapper.children.length > 0) {
      content.appendChild(buttonWrapper);
    }
  }
  
  // 加入container
  container.appendChild(content);
  block.appendChild(container);

  container.appendChild(content);
  block.appendChild(container);
}
