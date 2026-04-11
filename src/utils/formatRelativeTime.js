/**
 * @param {string | Date | undefined} isoOrDate
 * @returns {string}
 */
export function formatRelativeTime(isoOrDate) {
  if (!isoOrDate) return '';
  const then = new Date(isoOrDate).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1 min ago' : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? '1 day ago' : `${d} days ago`;
  return new Date(isoOrDate).toLocaleDateString();
}
