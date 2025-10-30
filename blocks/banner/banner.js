/**
 * Banner Block for AEM Edge Delivery Services
 * Supports dynamic button rendering based on buttonCount selection
 */

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
      const cell = cells[1];

      // Handle button links
      if (key.endsWith('ButtonLink')) {
        const link = cell.querySelector('a');
        if (link) {
          data[key] = link.getAttribute('href');
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
  const mainButtonLink = data.mainButtonLink || '#';
  const mainButtonText = data.mainButtonText || '';
  const mainButtonType = data.mainButtonType || 'primary';

  // Sub button
  const subButtonLink = data.subButtonLink || '#';
  const subButtonText = data.subButtonText || '';
  const subButtonType = data.subButtonType || 'secondary';

  // Clear and rebuild
  block.innerHTML = '';

  // Container
  const container = document.createElement('div');
  container.className = 'banner-container';

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'banner-content';

  // Image
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

  // Create buttons based on buttonCount
  if (buttonCount !== 'none') {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'banner-buttons';

    // Helper function to create button
    const createButton = (text, link, type) => {
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

    // Add main button
    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createButton(mainButtonText, mainButtonLink, mainButtonType);
      if (mainBtn) {
        buttonContainer.appendChild(mainBtn);
      }
    }

    // Add sub button
    if (buttonCount === 'main-and-sub') {
      const subBtn = createButton(subButtonText, subButtonLink, subButtonType);
      if (subBtn) {
        buttonContainer.appendChild(subBtn);
      }
    }

    // Only add button container if it has buttons
    if (buttonContainer.children.length > 0) {
      content.appendChild(buttonContainer);
    }
  }

  // Add container to block
  container.appendChild(content);
  block.appendChild(container);
}
