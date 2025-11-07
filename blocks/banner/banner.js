// 預設值配置
const DEFAULT_VALUES = {
  buttonCount: 'main-and-sub',
  subtitle: '時時掌握交易資訊，絕不漏接重要新聞，大事小事通通報你知！',
  mainButtonText: '重要公告',
  subButtonText: '新聞直播',
  mainButtonLink: '#',
  subButtonLink: '#',
};

// 🔧 工具函數：提取 AEM 內容路徑
function extractContentPath(el) {
  if (!el) return '';

  const link = el.querySelector?.('a');
  const candidates = [
    link?.getAttribute('href'),
    link?.href,
    link?.dataset?.value,
    link?.dataset?.href,
    link?.textContent?.trim(),
    el.dataset?.value,
    el.dataset?.href,
    el.textContent?.trim(),
  ];

  const normalized = candidates.filter(Boolean).map((v) => v.toString().trim());

  // 優先找直接以 /content/ 開頭的
  const direct = normalized.find((v) => v.startsWith('/content/'));
  if (direct) return direct;

  // 從文字中間找
  const found = normalized.find((v) => v.indexOf('/content/') !== -1);
  if (found) {
    const idx = found.indexOf('/content/');
    return found.slice(idx).split(/[\s"']+/)[0];
  }

  return '';
}

// 🎨 共用渲染函數
function renderBanner(data) {
  const container = document.createElement('div');
  container.className = 'banner-container';

  const content = document.createElement('div');
  content.className = 'banner-content';

  // 標題
  if (data.title) {
    const title = document.createElement('h1');
    title.className = 'banner-title';
    title.textContent = data.title;
    content.appendChild(title);
  }

  // 副標題
  if (data.subtitle) {
    const subtitle = document.createElement('div');
    subtitle.className = 'banner-subtitle';
    // 如果有 HTML，用 innerHTML；否則用 textContent
    if (data.subtitleHtml) {
      subtitle.innerHTML = data.subtitleHtml;
    } else {
      subtitle.textContent = data.subtitle;
    }
    content.appendChild(subtitle);
  }

  // 按鈕
  const buttonCount = data.buttonCount?.toLowerCase() || 'none';
  if (buttonCount !== 'none') {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'banner-buttons';

    const createBtn = (text, link, type) => {
      if (!text) return null;
      const wrapper = document.createElement('div');
      wrapper.className = 'button-wrapper';
      const a = document.createElement('a');
      a.className = `button ${type}`;
      a.href = link || '#';
      a.textContent = text;
      wrapper.appendChild(a);
      return wrapper;
    };

    // 主按鈕
    if (buttonCount === 'main-only' || buttonCount === 'main-and-sub') {
      const mainBtn = createBtn(data.mainButtonText, data.mainButtonLink, 'primary');
      if (mainBtn) btnContainer.appendChild(mainBtn);
    }

    // 次按鈕
    if (buttonCount === 'main-and-sub') {
      const subBtn = createBtn(data.subButtonText, data.subButtonLink, 'secondary');
      if (subBtn) btnContainer.appendChild(subBtn);
    }

    if (btnContainer.children.length > 0) {
      content.appendChild(btnContainer);
    }
  }

  container.appendChild(content);

  // 圖片
  if (data.image) {
    const img = document.createElement('img');
    img.src = data.image;
    img.alt = data.imageAlt || data.title || '';
    img.className = 'banner-image';
    container.appendChild(img);
  }

  return container;
}

// 🎨 編輯器模式：解析並渲染
function handleEditorMode(block) {
  // 取得所有欄位元素
  const titleEl = block.querySelector('[data-aue-prop="title"]');
  const subtitleEl = block.querySelector('[data-aue-prop="subtitle"]');
  const imageWrapper = block.querySelector('[data-aue-prop="image"]');
  const buttonCountEl = block.querySelector('[data-aue-prop="buttonCount"]');
  const mainTextEl = block.querySelector('[data-aue-prop="mainButtonText"]');
  const subTextEl = block.querySelector('[data-aue-prop="subButtonText"]');
  const mainLinkWrapper = block.querySelector('[data-aue-prop="mainButtonLink"]');
  const subLinkWrapper = block.querySelector('[data-aue-prop="subButtonLink"]');

  // 提取圖片
  const imageInWrapper = imageWrapper?.tagName === 'IMG'
    ? imageWrapper
    : imageWrapper?.querySelector('img');

  // 準備資料
  const data = {
    title: titleEl?.textContent.trim() || '',
    subtitle: subtitleEl?.textContent.trim() || '',
    subtitleHtml: subtitleEl?.innerHTML || '',
    image: imageInWrapper?.getAttribute('src') || '',
    imageAlt: imageInWrapper?.getAttribute('alt') || '',
    buttonCount: buttonCountEl?.textContent.trim().toLowerCase() || 'none',
    mainButtonText: mainTextEl?.textContent.trim() || '',
    subButtonText: subTextEl?.textContent.trim() || '',
    mainButtonLink: extractContentPath(mainLinkWrapper),
    subButtonLink: extractContentPath(subLinkWrapper),
  };

  // 隱藏所有原始欄位
  const hideElement = (el) => {
    if (!el) return;
    el.style.setProperty('display', 'none', 'important');
    el.querySelectorAll('*').forEach((child) => {
      child.style.setProperty('display', 'none', 'important');
    });
  };

  [titleEl, subtitleEl, imageWrapper, buttonCountEl,
    mainTextEl, subTextEl, mainLinkWrapper, subLinkWrapper].forEach((el) => {
    if (el) {
      hideElement(el);
      hideElement(el.parentElement);
    }
  });

  // 渲染預覽
  block.innerHTML = '';
  block.appendChild(renderBanner(data));
}

// 📄 表格模式：解析資料
function parseTableMode(block) {
  const rows = [...block.children];
  const data = {};

  // 通用解析函數
  const parseRow = (index, key) => {
    const cell = rows[index]?.children[0];
    if (!cell) return;

    if (key === 'image') {
      const img = cell.querySelector('img');
      if (img) {
        data.image = img.getAttribute('src');
        data.imageAlt = img.getAttribute('alt') || '';
      }
      return;
    }

    const link = cell.querySelector('a[href]');
    if (link) {
      data[`${key}Link`] = link.getAttribute('href');
      if (!data[key]) data[key] = link.textContent.trim();
      return;
    }

    const p = cell.querySelector('p');
    data[key] = p ? p.textContent.trim() : cell.textContent.trim();
  };

  // 解析各行
  parseRow(0, 'title');
  parseRow(1, 'subtitle');
  parseRow(2, 'image');
  parseRow(3, 'buttonCount');
  parseRow(4, 'mainButtonText');
  parseRow(5, 'subButtonText');

  // 套用預設值
  Object.keys(DEFAULT_VALUES).forEach((key) => {
    if (!data[key]) data[key] = DEFAULT_VALUES[key];
  });

  return data;
}

// 🎯 主函數
export default function decorate(block) {
  const isEditor = block.hasAttribute('data-aue-resource');

  // 檢查是否有 data-aue-prop（Universal Editor 模式）
  const hasProps = block.querySelectorAll('[data-aue-prop]').length > 0;

  if (isEditor && hasProps) {
    // 編輯器模式
    handleEditorMode(block);
  } else {
    // Runtime 模式
    let data;

    if (hasProps) {
      // 從 data-aue-prop 解析
      data = {};
      block.querySelectorAll('[data-aue-prop]').forEach((el) => {
        const key = el.getAttribute('data-aue-prop');

        const img = el.querySelector('img');
        if (img?.getAttribute('src')) {
          data[key] = img.getAttribute('src');
          return;
        }

        const a = el.querySelector('a[href]');
        if (a) {
          data[key] = a.getAttribute('href');
          return;
        }

        const text = el.textContent.trim();
        if (text) data[key] = text;
      });
    } else {
      // 從表格解析
      data = parseTableMode(block);
    }

    // 渲染
    block.innerHTML = '';
    block.appendChild(renderBanner(data));
  }
}
