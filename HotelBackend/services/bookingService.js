import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

// ── Validation Helpers ──────────────────────────────────────────────

const VALID_PAYMENT_METHODS = ['Cash', 'Card', 'Online'];

/**
 * Validate booking input data.
 * Returns { valid: true } or { valid: false, message: string }
 */
export const validateBookingInput = ({ room, checkInDate, checkOutDate, guestCount, paymentMethod }) => {
  if (!room) {
    return { valid: false, message: 'Room ID is required' };
  }

  if (!checkInDate || !checkOutDate) {
    return { valid: false, message: 'Check-in and check-out dates are required' };
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }

  if (checkOut <= checkIn) {
    return { valid: false, message: 'Check-out date must be after check-in date' };
  }

  // Check-in should not be in the past (compare date-only, ignoring time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDay = new Date(checkIn);
  checkInDay.setHours(0, 0, 0, 0);

  if (checkInDay < today) {
    return { valid: false, message: 'Check-in date cannot be in the past' };
  }

  if (guestCount !== undefined && (typeof guestCount !== 'number' || guestCount < 1)) {
    return { valid: false, message: 'Guest count must be at least 1' };
  }

  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return { valid: false, message: `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` };
  }

  return { valid: true };
};

// ── Availability Check ──────────────────────────────────────────────

/**
 * Check if a room is available for the given date range.
 * excludeBookingId — optionally exclude a booking (useful for updates).
 * Returns { available: boolean, conflictingBooking? }
 */
export const checkRoomAvailability = async (roomId, checkInDate, checkOutDate, excludeBookingId = null) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const filter = {
    room: roomId,
    status: { $in: ['Pending', 'Approved'] },
    // Standard overlap detection: two ranges overlap if one starts before the other ends AND ends after the other starts
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(filter);

  return {
    available: !conflictingBooking,
    conflictingBooking,
  };
};

// ── Price Calculation ───────────────────────────────────────────────

/**
 * Calculate total price for a booking.
 * Returns { totalAmount, nights, room } or throws an error if room not found.
 */
export const calculateTotalPrice = async (roomId, checkInDate, checkOutDate) => {
  const room = await Room.findById(roomId);
  if (!room) {
    return { error: 'Room not found' };
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const totalAmount = nights * room.price;

  return { totalAmount, nights, room };
};
