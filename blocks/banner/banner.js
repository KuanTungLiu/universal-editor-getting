/**
 * Banner Block for AEM Edge Delivery Services
 * Supports dynamic button rendering based on buttonCount selection
 */

function createButton(text, link, title, isPrimary = true) {
  if (!text) return null;

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  // Create link
  const buttonLink = document.createElement('a');
  buttonLink.className = 'button';
  if (isPrimary) {
    buttonLink.classList.add('primary');
  } else {
    buttonLink.classList.add('secondary');
  }
  
  buttonLink.href = link || '#';
  buttonLink.textContent = text;
  
  if (title) {
    buttonLink.title = title;
  }
  
  buttonContainer.appendChild(buttonLink);
  return buttonContainer;
}export default function decorate(block) {
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
      const cell = cells[1];
      
      // 特殊處理按鈕相關欄位
      if (key.includes('ButtonLink')) {
        const link = cell.querySelector('a');
        if (link) {
          data[key] = link.getAttribute('href');
          // 如果按鈕文字還沒設定，使用連結的文字
          const textKey = key.replace('Link', 'Text');
          if (!data[textKey]) {
            data[textKey] = link.textContent.trim();
          }
        }
      } else {
        data[key] = cell.textContent.trim();
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
