/**
 * Banner Block for AEM Edge Delivery Services
 * Supports dynamic button rendering based on buttonCount selection
 */

export default function decorate(block) {
  const isEditor = block.hasAttribute('data-aue-resource');

  // Parse block content
  const rows = [...block.children];
  const data = {};

  // Extract data from rows
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim();
      const cell = cells[1];
      const value = cell.innerHTML.trim();
      data[key] = value;

      // Special handling for button links
      if (key.endsWith('ButtonLink')) {
        const link = cell.querySelector('a');
        if (link) {
          data[key] = link.getAttribute('href');
        }
      }
    }
  });

  // If in editor mode, only enhance buttons
  if (isEditor) {
    const buttonRows = rows.filter((row) => {
      const key = row.children[0].textContent.trim();
      return key.endsWith('ButtonText');
    });

    buttonRows.forEach((row) => {
      const btnCell = row.children[1];
      if (btnCell.textContent.trim()) {
        const btn = document.createElement('button');
        btn.className = 'button primary';
        btn.textContent = btnCell.textContent.trim();
        btnCell.innerHTML = '';
        btnCell.appendChild(btn);
      }
    });
    return;
  }

  // Clear for runtime mode
  block.innerHTML = '';

  // Create container structure
  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // Add title
  if (data.title) {
    const titleEl = document.createElement('h1');
    titleEl.className = 'banner-title';
    titleEl.innerHTML = data.title;
    content.appendChild(titleEl);
  }

  // Add subtitle
  if (data.subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'banner-subtitle';
    subtitleEl.innerHTML = data.subtitle;
    content.appendChild(subtitleEl);
  }

  // Add image
  if (data.image) {
    const imgEl = document.createElement('img');
    imgEl.src = data.image;
    imgEl.alt = data.imageAlt || '';
    imgEl.className = 'banner-image';
    container.appendChild(imgEl);
  }

  // Handle buttons
  const buttonCount = data.buttonCount || 'none';
  if (buttonCount !== 'none') {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'banner-buttons';

    // Helper function to create button
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

    // Add main button
    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createButton(
        data.mainButtonText,
        data.mainButtonLink,
        data.mainButtonType || 'primary',
      );
      if (mainBtn) buttonContainer.appendChild(mainBtn);
    }

    // Add sub button
    if (buttonCount === 'main-and-sub') {
      const subBtn = createButton(
        data.subButtonText,
        data.subButtonLink,
        data.subButtonType || 'secondary',
      );
      if (subBtn) buttonContainer.appendChild(subBtn);
    }

    if (buttonContainer.children.length > 0) {
      content.appendChild(buttonContainer);
    }
  }

  // Finalize
  container.appendChild(content);
  block.appendChild(container);
}
