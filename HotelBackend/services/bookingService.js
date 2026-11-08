import Room from '../models/Room.js';

// ── Validation Helpers ──────────────────────────────────────────────

const VALID_PAYMENT_METHODS = ['Cash', 'Card', 'Online'];

/**
 * Validate booking input data.
 * Returns { valid: true } or { valid: false, message: string }
 */
export const validateBookingInput = ({
  room,
  checkInDate,
  checkOutDate,
  check_in_datetime,
  check_out_datetime,
  guestCount,
  paymentMethod,
}) => {
  if (!room) {
    return { valid: false, message: 'Room ID is required' };
  }

  const inRaw = check_in_datetime || checkInDate;
  const outRaw = check_out_datetime || checkOutDate;

  if (!inRaw || !outRaw) {
    return { valid: false, message: 'Check-in and check-out dates are required' };
  }

  const checkIn = new Date(inRaw);
  const checkOut = new Date(outRaw);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }

  if (checkOut <= checkIn) {
    return { valid: false, message: 'Check-out date must be after check-in date' };
  }

  // Check-in should not be in the past (keep legacy day-based rule for UX)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDay = new Date(checkIn);
  checkInDay.setHours(0, 0, 0, 0);

  if (checkInDay < today) {
    return { valid: false, message: 'Check-in date cannot be in the past' };
  }

  const gc = Number(guestCount);
  if (
    guestCount !== undefined &&
    guestCount !== null &&
    (Number.isNaN(gc) || gc < 1)
  ) {
    return { valid: false, message: 'Guest count must be at least 1' };
  }

  if (
    paymentMethod != null &&
    paymentMethod !== '' &&
    !VALID_PAYMENT_METHODS.includes(paymentMethod)
  ) {
    return { valid: false, message: `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` };
  }

  return { valid: true };
};

/**
 * Ensure guest count does not exceed room capacity.
 */
export const assertGuestCapacity = (roomDoc, guestCount) => {
  if (!roomDoc) {
    return { ok: false, message: 'Room not found' };
  }
  const cap =
    typeof roomDoc.capacity === 'number' && roomDoc.capacity > 0 ? roomDoc.capacity : 4;
  if (guestCount > cap) {
    return {
      ok: false,
      message: `Number of guests cannot exceed room capacity (${cap})`,
    };
  }
  return { ok: true };
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
