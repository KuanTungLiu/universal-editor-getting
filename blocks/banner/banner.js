/**
 * Banner Block for AEM Edge Delivery Services
 * Supports banner type selection with announcement and news buttons
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
      data[key] = cell.textContent.trim();
    }
  });

  // Extract values
  const title = data.title || '';
  const subtitle = data.subtitle || '';
  const image = data.image || '';
  const imageAlt = data.imageAlt || '';

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

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'banner-buttons';

  // Add buttons
  const primaryBtn = document.createElement('button');
  primaryBtn.className = 'button primary';
  primaryBtn.textContent = '重要公告';
  buttonContainer.appendChild(primaryBtn);

  const secondaryBtn = document.createElement('button');
  secondaryBtn.className = 'button secondary';
  secondaryBtn.textContent = '新聞直播';
  buttonContainer.appendChild(secondaryBtn);

  // Add button container to content
  content.appendChild(buttonContainer);

  // Add container to block
  container.appendChild(content);
  block.appendChild(container);
}
