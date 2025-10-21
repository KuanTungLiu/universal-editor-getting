/* /blocks/teaser/teaser.js */

/**
 * Adds a zoom effect to image using event listeners.
 *
 * When the CTA button is hovered over, the image zooms in.
 *
 * @param {HTMLElement} block represents the block's DOM tree
 */
function addEventListeners(block) {
  const button = block.querySelector('.button');
  const image = block.querySelector('.image');
  // 檢查元素是否存在
  if (button && image) {
    button.addEventListener('mouseover', () => {
      image.classList.add('zoom');
    });

    button.addEventListener('mouseout', () => {
      image.classList.remove('zoom');
    });
  }
}

/**
 * Entry point to block's JavaScript.
 * Must be exported as default and accept a block's DOM element.
 * This function is called by the project's style.js, and passed the block's element.
 *
 * @param {HTMLElement} block represents the block's DOM element/tree
 */
export default function decorate(block) {
  /* This JavaScript makes minor adjustments to the block's DOM */

  // Dress the DOM elements with semantic CSS classes so it's obvious what they are.
  // If needed we could also add ARIA roles and attributes, or add/remove/move DOM elements.

  // Add a class to the first picture element to target it with CSS
  const picture = block.querySelector('picture');
  if (picture) {
    picture.classList.add('image-wrapper');
  }

  // Use previously applied classes to target new elements
  const img = block.querySelector('.image-wrapper img');
  if (img) {
    img.classList.add('image');
  }

  // Mark the second/last div as the content area (white, bottom aligned box w/ text and cta)
  const lastDiv = block.querySelector(':scope > div:last-child');
  if (lastDiv) {
    lastDiv.classList.add('content');
  }

  // Mark the first H1-H6 as a title
  const heading = block.querySelector('h1,h2,h3,h4,h5,h6');
  if (heading) {
    heading.classList.add('title');
  }

  // Process each paragraph and mark it as text or terms-and-conditions
  block.querySelectorAll('p').forEach((p) => {
    const innerHTML = p.innerHTML?.trim();

    // If the paragraph starts with 'Terms and conditions:' then style it as such
    if (innerHTML?.startsWith('Terms and conditions:')) {
      p.classList.add('terms-and-conditions');
    }
  });

  // Add event listeners to the block
  addEventListeners(block);
}
