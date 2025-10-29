/*
  Minimal banner behavior script

  Responsibilities:
  - Listen to the "buttonCount" select (or data attribute) and show/hide
    main/sub buttons accordingly.
  - Supports three states for buttonCount: "none", "main-only", "main-and-sub".

  Expected HTML conventions (non-invasive):
  - The banner root has class `.banner`.
  - Main button should have class `.btn-primary` (or attribute `[data-main-button]`).
  - Secondary button should have class `.btn-secondary` (or attribute `[data-sub-button]`).
  - The button-count control is a <select name="buttonCount"> inside the banner
    (or any element with attribute `data-button-count-select`).

  This file is intentionally small and dependency-free so it can be used both
  on the editor preview and on the live site.
*/
(() => {
  function setVisibility(el, visible) {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }

  function applyButtonState(banner, state) {
    const main = banner.querySelector('.btn-primary') || banner.querySelector('[data-main-button]');
    const sub = banner.querySelector('.btn-secondary') || banner.querySelector('[data-sub-button]');

    switch (state) {
      case 'main-only':
        setVisibility(main, true);
        setVisibility(sub, false);
        break;
      case 'main-and-sub':
        setVisibility(main, true);
        setVisibility(sub, true);
        break;
      case 'none':
      default:
        setVisibility(main, false);
        setVisibility(sub, false);
        break;
    }
  }

  function initBanner(banner) {
    if (!banner) return;

    const select = banner.querySelector('select[name="buttonCount"]') || banner.querySelector('[data-button-count-select]');

    // initial state: check data attribute, select value, or default to 'none'
    const initial = (select && select.value) || banner.getAttribute('data-button-count') || 'none';
    applyButtonState(banner, initial);

    if (select) {
      select.addEventListener('change', () => {
        applyButtonState(banner, select.value);
      });
    }

    // If the banner is edited live (e.g. inside a CMS editor), some tool may
    // update attributes — observe for attribute changes to keep state in sync.
    const mo = new MutationObserver((records) => {
      records.forEach((r) => {
        if (r.type === 'attributes' && r.attributeName === 'data-button-count') {
          applyButtonState(banner, banner.getAttribute('data-button-count') || (select && select.value) || 'none');
        }
      });
    });
    mo.observe(banner, { attributes: true });
  }

  // Initialize on DOMContentLoaded and for banners added later
  function initAll() {
    document.querySelectorAll('.banner').forEach(initBanner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Expose for testing/debugging (non-enumerable)
  try {
    Object.defineProperty(window, 'BannerControls', { value: { initBanner }, configurable: true });
  } catch (e) {
    // ignore in restrictive environments
  }
})();
