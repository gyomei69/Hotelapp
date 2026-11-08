/**
 * Deluxe room: bundled image so user + admin always show the same photo (offline-safe).
 * URL below must stay in sync with `DELUXE_IMAGE` in HotelBackend/seed.js for API/DB.
 */
export const DELUXE_ROOM_LOCAL = require('../../assets/rooms/deluxe-room.jpg');

/** Bundled photo when DB has no `imageUrl` for Ocean View rooms (must match admin create flow). */
export const OCEANVIEW_ROOM_LOCAL = require('../../assets/rooms/oceanview.jpg');

/** Working HTTPS fallback (same scene as bundled asset) — e.g. seed data, exports */
export const DELUXE_ROOM_IMAGE_URL =
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85';

// Generic fallback when DB has no imageUrl (offline-safe, but not room-specific).
const DEFAULT_ROOM_IMAGE_LOCAL = require('../../assets/hotel-welcome.png');

/** True for type labels that represent a Deluxe room (DB may vary casing/spacing). */
export const isDeluxeRoomType = (roomType) => {
  if (roomType == null || typeof roomType !== 'string') return false;
  const t = roomType.trim().toLowerCase();
  return t === 'deluxe' || t.includes('deluxe');
};

/** Ocean View (spacing/casing tolerant). */
export const isOceanViewRoomType = (roomType) => {
  if (roomType == null || typeof roomType !== 'string') return false;
  const t = roomType.trim().toLowerCase().replace(/\s+/g, ' ');
  return t.includes('ocean') && t.includes('view');
};

export const getRoomImageByType = (roomType) => {
  // For DB-driven images we don't hardcode type → URL mappings.
  // Keep a tiny compatibility fallback for Deluxe only (legacy seed constant).
  if (roomType == null || typeof roomType !== 'string') return DELUXE_ROOM_IMAGE_URL;
  const lower = roomType.trim().toLowerCase();
  if (lower.includes('deluxe')) return DELUXE_ROOM_IMAGE_URL;
  if (isOceanViewRoomType(roomType)) return '';
  return '';
};

/**
 * Pass to `<Image source={getRoomImageSource(room)} />` — Deluxe uses bundled asset; others use uri.
 */
export const getRoomImageSource = (room) => {
  const raw = room?.imageUrl && String(room.imageUrl).trim();
  if (raw) return { uri: raw };
  if (isOceanViewRoomType(room?.type)) return OCEANVIEW_ROOM_LOCAL;
  // If Deluxe has no URL, fall back to bundled asset.
  if (isDeluxeRoomType(room?.type)) return DELUXE_ROOM_LOCAL;
  // Otherwise show a neutral local placeholder.
  return DEFAULT_ROOM_IMAGE_LOCAL;
};

/** String URL for legacy `uri` usage; Deluxe returns canonical URL (prefer getRoomImageSource). */
export const getRoomImage = (room) => {
  const raw = room?.imageUrl && String(room.imageUrl).trim();
  if (raw) return raw;
  if (isOceanViewRoomType(room?.type)) return '';
  if (isDeluxeRoomType(room?.type)) return DELUXE_ROOM_IMAGE_URL;
  return getRoomImageByType(room?.type);
};
