export default function decorate(block) {
  // Parse block data
  const rows = [...block.children];
  const data = {};

  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim();
      const value = cells[1].textContent.trim() || cells[1].innerHTML.trim();
      data[key] = value;
    }
  });

  // Extract values
  const {
    title = '',
    subtitle = '',
    image = '',
    imageAlt = '',
    buttonCount = 'none',
    mainButtonText = '',
    mainButtonLink = '',
    subButtonText = '',
    subButtonLink = '',
  } = data;

  // Clear block
  block.innerHTML = '';

  // Create container
  const container = document.createElement('div');
  container.className = 'banner-container';

  // Image
  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = imageAlt;
    img.className = 'banner-image';
    container.appendChild(img);
  }

  // Content
  const content = document.createElement('div');
  content.className = 'banner-content';

  // Title
  if (title) {
    const h1 = document.createElement('h1');
    h1.textContent = title;
    content.appendChild(h1);
  }

  // Subtitle
  if (subtitle) {
    const sub = document.createElement('div');
    sub.className = 'banner-subtitle';
    sub.innerHTML = subtitle;
    content.appendChild(sub);
  }

  // Buttons
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'banner-buttons';

  // Main button
  if ((buttonCount === 'main-only' || buttonCount === 'main-and-sub') && mainButtonText && mainButtonLink) {
    const mainBtn = document.createElement('a');
    mainBtn.className = 'btn-primary';
    mainBtn.href = mainButtonLink;
    mainBtn.textContent = mainButtonText;
    buttonsDiv.appendChild(mainBtn);
  }

  // Sub button
  if (buttonCount === 'main-and-sub' && subButtonText && subButtonLink) {
    const subBtn = document.createElement('a');
    subBtn.className = 'btn-secondary';
    subBtn.href = subButtonLink;
    subBtn.textContent = subButtonText;
    buttonsDiv.appendChild(subBtn);
  }

  if (buttonsDiv.children.length > 0) {
    content.appendChild(buttonsDiv);
  }

  container.appendChild(content);
  block.appendChild(container);
}
