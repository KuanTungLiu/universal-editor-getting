function formatDateTime(value, type) {
  if (!value) return '';
  const date = new Date(value);
  const options = {
    datetime: { dateStyle: 'medium', timeStyle: 'medium' },
    date: { dateStyle: 'medium' },
    time: { timeStyle: 'medium' },
  }[type];
  return new Intl.DateTimeFormat('zh-TW', options).format(date);
}

export default function decorate(block) {
  // If we're in the editor, don't modify the structure
  if (block.hasAttribute('data-aue-resource')) {
    return;
  }

  // Clear existing content
  block.innerHTML = '';

  // Create container
  const container = document.createElement('div');
  container.className = 'datetime-container';

  // Get values from data attributes
  const dateTime = block.getAttribute('data-aue-value-dateTimeField');
  const date = block.getAttribute('data-aue-value-dateField');
  const time = block.getAttribute('data-aue-value-timeField');

  // Create and append datetime elements
  if (dateTime) {
    const el = document.createElement('div');
    el.className = 'datetime-full';
    el.innerHTML = `<strong>日期時間：</strong>${formatDateTime(dateTime, 'datetime')}`;
    container.appendChild(el);
  }

  if (date) {
    const el = document.createElement('div');
    el.className = 'datetime-date';
    el.innerHTML = `<strong>日期：</strong>${formatDateTime(date, 'date')}`;
    container.appendChild(el);
  }

  if (time) {
    const el = document.createElement('div');
    el.className = 'datetime-time';
    el.innerHTML = `<strong>時間：</strong>${formatDateTime(time, 'time')}`;
    container.appendChild(el);
  }

  block.appendChild(container);
}
