export default function decorate(block) {
  // Get the richtext content area if it exists
  const richTextArea = block.querySelector('[data-aue-type="richtext"][data-aue-prop="text"]');

  // If we're in the editor (has data-aue attributes)
  if (block.hasAttribute('data-aue-resource')) {
    // If we don't have a richtext area yet, create one with default content
    if (!richTextArea) {
      const defaultContent = document.createElement('div');
      defaultContent.setAttribute('data-aue-type', 'richtext');
      defaultContent.setAttribute('data-aue-prop', 'text');
      defaultContent.innerHTML = `
        <p>tags</p>
      `;
      block.appendChild(defaultContent);
    }
    // In editor mode, we keep the original content for editing
    return;
  }

  // Extract plain text content and split into lines for tag parsing
  const content = block.textContent.trim();
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);

  const tags = lines.map((line) => {
    const parts = line.split('|').map((s) => s.trim());
    const text = parts[0];
    const link = parts[1] || '#';
    return text ? { text, link } : null;
  }).filter(Boolean);

  // Clear the block and render the tags for the live site
  block.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'tags-container';
  tags.forEach((tag) => {
    const tagEl = document.createElement('a');
    tagEl.className = 'tag';
    tagEl.href = tag.link;
    tagEl.textContent = tag.text;
    container.appendChild(tagEl);
  });
  block.appendChild(container);
}
