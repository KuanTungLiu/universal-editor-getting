export default function decorate(block) {
  // If the block contains AEM/universal-editor instrumentation (editable richtext),
  // don't replace the DOM here. The editor relies on paragraphs / data-* attributes
  // being present so the editor UI can attach. If we are not in editing mode,
  // transform the textual content into rendered tag elements.
  if (block.querySelector('[data-aue-resource],[data-richtext-resource],[data-richtext-prop]')) {
    // leave the DOM intact for the editor to handle
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
