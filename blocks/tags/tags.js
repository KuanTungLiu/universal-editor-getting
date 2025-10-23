// blocks/tags/tags.js

export default function decorate(block) {
  // 獲取所有標籤
  const tags = [...block.children].map(row => {
    const link = row.querySelector('a');
    const text = link ? link.textContent : row.textContent;
    const href = link ? link.href : '#';
    
    return { text, href };
  });

  // 清空原有內容
  block.innerHTML = '';

  // 建立標籤容器
  const tagContainer = document.createElement('div');
  tagContainer.className = 'tags-container';

  // 為每個標籤建立元素
  tags.forEach(tag => {
    const tagElement = document.createElement('a');
    tagElement.className = 'tag';
    tagElement.href = tag.href;
    tagElement.textContent = tag.text;
    tagContainer.appendChild(tagElement);
  });

  block.appendChild(tagContainer);
}