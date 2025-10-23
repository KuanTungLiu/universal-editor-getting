export default function decorate(block) {
  const tags = [...block.children].map((row) => {
    const link = row.querySelector('a');
    const text = link ? link.textContent : row.textContent;
    const href = link ? link.href : '#';
    return { text, href };
  });

  block.innerHTML = '';
  const tagContainer = document.createElement('div');
  tagContainer.className = 'tags-container';

  tags.forEach((tag) => {
    const tagElement = document.createElement('a');
    tagElement.className = 'tag';
    tagElement.href = tag.href;
    tagElement.textContent = tag.text;
    tagContainer.appendChild(tagElement);
  });

  block.appendChild(tagContainer);
}
