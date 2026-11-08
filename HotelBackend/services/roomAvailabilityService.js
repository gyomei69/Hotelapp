import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

/** Bookings that still hold inventory (completed stays do not block new bookings). */
export const ACTIVE_BOOKING_STATUSES = ['Pending', 'Approved', 'Confirmed'];

/** Resolve catalog type key for a room document (roomType mirrors type when set). */
export function getRoomTypeKey(roomDoc) {
  if (!roomDoc) return null;
  return roomDoc.roomType || roomDoc.type || null;
}

/** Pool size for a room type: max(totalRooms) across all Room rows of that type. */
export async function getTotalRoomsForType(roomType) {
  if (!roomType) return 1;
  const agg = await Room.aggregate([
    { $match: { $or: [{ type: roomType }, { roomType }] } },
    { $group: { _id: null, maxPool: { $max: '$totalRooms' } } },
  ]);
  const n = agg[0]?.maxPool;
  return typeof n === 'number' && n >= 1 ? n : 1;
}

/**
 * Count bookings overlapping dates for any room of the given type.
 * Overlap: (checkIn less than existing.checkOut) AND (checkOut greater than existing.checkIn)
 */
export async function countOverlappingBookingsForRoomType(
  roomType,
  checkInDate,
  checkOutDate,
  excludeBookingId = null
) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const roomIds = await Room.find({
    $or: [{ type: roomType }, { roomType }],
  }).distinct('_id');

  if (!roomIds.length) return 0;

  const filter = {
    room: { $in: roomIds },
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  return Booking.countDocuments(filter);
}

/** True if another active booking uses the same room id with overlapping dates. */
export async function hasSameRoomDateConflict(roomId, checkInDate, checkOutDate, excludeBookingId = null) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const filter = {
    room: roomId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  const conflict = await Booking.findOne(filter).select('_id checkInDate checkOutDate').lean();
  return { conflict: conflict || null };
}

/**
 * Full availability for a new booking: no overlap on the same physical room,
 * and overlapping bookings for this room type stay below the totalRooms pool.
 */
export async function assertRoomAvailabilityForBooking(
  roomId,
  checkInDate,
  checkOutDate,
  excludeBookingId = null
) {
  const room = await Room.findById(roomId).lean();
  if (!room) {
    return { ok: false, message: 'Room not found' };
  }

  const roomType = getRoomTypeKey(room);
  if (!roomType) {
    return { ok: false, message: 'Room type is not configured' };
  }

  const { conflict } = await hasSameRoomDateConflict(roomId, checkInDate, checkOutDate, excludeBookingId);
  if (conflict) {
    return {
      ok: false,
      message: 'Selected dates are not available for this room type',
      conflict,
    };
  }

  const totalRooms = await getTotalRoomsForType(roomType);
  const overlapCount = await countOverlappingBookingsForRoomType(
    roomType,
    checkInDate,
    checkOutDate,
    excludeBookingId
  );

  if (overlapCount >= totalRooms) {
    return {
      ok: false,
      message: 'Selected dates are not available for this room type',
    };
  }

  return { ok: true };
}
