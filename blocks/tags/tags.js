export default function decorate(block) {
  // If we're in the editor (has data-aue attributes)
  if (block.hasAttribute('data-aue-resource')) {
    // In editor mode, we ensure the tag picker is properly initialized
    if (!block.querySelector('[data-aue-prop="cq:tags"]')) {
      const tagPicker = document.createElement('div');
      tagPicker.setAttribute('data-aue-type', 'aem-tag');
      tagPicker.setAttribute('data-aue-prop', 'cq:tags');
      block.appendChild(tagPicker);
    }
    return;
  }

  // Get AEM tags from the data attributes
  const tagsList = block.getAttribute('data-aue-value-cq:tags');
  const tags = tagsList ? JSON.parse(tagsList) : [];

  // Clear the block and render the tags for the live site
  block.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'tags-container';
  tags.forEach((tagPath) => {
    const tagName = tagPath.split('/').pop(); // Get last segment of tag path
    const tagEl = document.createElement('a');
    tagEl.className = 'tag';
    tagEl.href = `/tags/${tagPath}`; // You might want to adjust this URL pattern
    tagEl.textContent = tagName;
    container.appendChild(tagEl);
  });
  block.appendChild(container);
}
