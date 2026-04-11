/**
 * Deluxe room: bundled image so user + admin always show the same photo (offline-safe).
 * URL below must stay in sync with `DELUXE_IMAGE` in HotelBackend/seed.js for API/DB.
 */
export const DELUXE_ROOM_LOCAL = require('../../assets/rooms/deluxe-room.jpg');

/** Working HTTPS fallback (same scene as bundled asset) — e.g. seed data, exports */
export const DELUXE_ROOM_IMAGE_URL =
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85';

const ROOM_TYPE_IMAGES = {
  Standard:
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80',
  Deluxe: DELUXE_ROOM_IMAGE_URL,
  Suite:
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80',
  'Ocean View':
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80',
  Penthouse:
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
};

const DEFAULT_ROOM_IMAGE = ROOM_TYPE_IMAGES.Standard;

/** True for type labels that represent a Deluxe room (DB may vary casing/spacing). */
export const isDeluxeRoomType = (roomType) => {
  if (roomType == null || typeof roomType !== 'string') return false;
  const t = roomType.trim().toLowerCase();
  return t === 'deluxe' || t.includes('deluxe');
};

export const getRoomImageByType = (roomType) => {
  if (roomType == null || typeof roomType !== 'string') return DEFAULT_ROOM_IMAGE;
  const trimmed = roomType.trim();
  if (ROOM_TYPE_IMAGES[trimmed]) return ROOM_TYPE_IMAGES[trimmed];
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(ROOM_TYPE_IMAGES)) {
    if (key.toLowerCase() === lower) return ROOM_TYPE_IMAGES[key];
  }
  if (lower.includes('deluxe')) return DELUXE_ROOM_IMAGE_URL;
  return DEFAULT_ROOM_IMAGE;
};

/**
 * Pass to `<Image source={getRoomImageSource(room)} />` — Deluxe uses bundled asset; others use uri.
 */
export const getRoomImageSource = (room) => {
  if (isDeluxeRoomType(room?.type)) {
    return DELUXE_ROOM_LOCAL;
  }
  const raw = room?.imageUrl && String(room.imageUrl).trim();
  if (raw) return { uri: raw };
  return { uri: getRoomImageByType(room?.type) };
};

/** String URL for legacy `uri` usage; Deluxe returns canonical URL (prefer getRoomImageSource). */
export const getRoomImage = (room) => {
  if (isDeluxeRoomType(room?.type)) return DELUXE_ROOM_IMAGE_URL;
  const raw = room?.imageUrl && String(room.imageUrl).trim();
  if (raw) return raw;
  return getRoomImageByType(room?.type);
};
