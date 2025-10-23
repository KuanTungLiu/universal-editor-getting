export default function decorate(block) {
  // 從 block 中獲取文字內容
  const content = block.textContent.trim();

  // 按行分割
  const lines = content.split('\n').filter((line) => line.trim());

  const tags = [];

  // 解析每一行
  lines.forEach((line) => {
    // 按 | 分割成文字和連結
    const parts = line.split('|').map((s) => s.trim());
    const text = parts[0];
    const link = parts[1] || '#';

    if (text) {
      tags.push({ text, link });
    }
  });

  // 清空原有內容
  block.innerHTML = '';

  // 建立標籤容器
  const container = document.createElement('div');
  container.className = 'tags-container';

  // 為每個標籤建立元素
  tags.forEach((tag) => {
    const tagEl = document.createElement('a');
    tagEl.className = 'tag';
    tagEl.href = tag.link;
    tagEl.textContent = tag.text;
    container.appendChild(tagEl);
  });

  block.appendChild(container);
}
