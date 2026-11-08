import mongoose from 'mongoose';

const CHECK_IN_STATUS = ['Pending', 'Checked-In'];
const CHECK_OUT_STATUS = ['Pending', 'Checked-Out'];
const BOOKING_PRIMARY_STATUS = [
  'Pending',
  'Approved',
  'Confirmed',
  'Checked-In',
  'Checked-Out',
  'Completed',
  'Rejected',
  'Cancelled',
];

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Room',
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    /**
     * Datetime booking fields (new, forward-compatible).
     * We keep the existing `checkInDate` / `checkOutDate` for backward compatibility.
     * New clients should send/read `check_in_datetime` / `check_out_datetime`.
     */
    check_in_datetime: {
      type: Date,
      default: null,
      index: true,
    },
    check_out_datetime: {
      type: Date,
      default: null,
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    guestCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Online'],
      default: 'Cash',
    },
    /** Tracks payment lifecycle — revenue counts only when Paid */
    paymentStatus: {
      type: String,
      enum: [
        'Unpaid',
        'Awaiting Admin',
        'Awaiting Payment',
        'Pending',
        'Pending Payment at Hotel',
        'Paid',
        'Failed',
      ],
      default: 'Unpaid',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    specialRequests: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Confirmed', 'Completed'],
      default: 'Pending',
    },
    /**
     * Single authoritative lifecycle status (requested).
     * This replaces the legacy "stacking" of status + check-in/out.
     */
    booking_status: {
      type: String,
      enum: BOOKING_PRIMARY_STATUS,
      default: 'Pending',
      index: true,
    },
    checkInStatus: {
      type: String,
      default: 'Pending',
    },
    checkOutStatus: {
      type: String,
      default: 'Pending',
    },
    /**
     * New lifecycle fields (requested).
     * Synced with legacy `checkInStatus`/`checkOutStatus` for compatibility.
     */
    check_in_status: {
      type: String,
      enum: CHECK_IN_STATUS,
      default: 'Pending',
      index: true,
    },
    check_out_status: {
      type: String,
      enum: CHECK_OUT_STATUS,
      default: 'Pending',
      index: true,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ room: 1, check_in_datetime: 1, check_out_datetime: 1 });
bookingSchema.index({ booking_status: 1, createdAt: -1 });

bookingSchema.virtual('notes').get(function () {
  return this.specialRequests;
});

bookingSchema.post('init', function normalizeLegacyCheckStatuses() {
  if (this.checkInStatus === 'checked_in') this.checkInStatus = 'Checked-In';
  else if (this.checkInStatus === 'pending') this.checkInStatus = 'Pending';
  if (this.checkOutStatus === 'checked_out') this.checkOutStatus = 'Checked-Out';
  else if (this.checkOutStatus === 'pending') this.checkOutStatus = 'Pending';
});

function normalizeCheckInStatus(v) {
  if (v === 'Checked-In' || v === 'checked_in') return 'Checked-In';
  return 'Pending';
}

function normalizeCheckOutStatus(v) {
  if (v === 'Checked-Out' || v === 'checked_out') return 'Checked-Out';
  return 'Pending';
}

function normalizePrimaryStatus(v) {
  const s = String(v || '').trim();
  if (BOOKING_PRIMARY_STATUS.includes(s)) return s;
  return 'Pending';
}

function inferPrimaryStatusFromLegacyFields(doc) {
  const legacyStatus = String(doc.status || 'Pending');
  const inS = normalizeCheckInStatus(doc.check_in_status || doc.checkInStatus);
  const outS = normalizeCheckOutStatus(doc.check_out_status || doc.checkOutStatus);

  if (legacyStatus === 'Completed') return 'Completed';
  if (legacyStatus === 'Cancelled') return 'Cancelled';
  if (legacyStatus === 'Rejected') return 'Rejected';
  if (outS === 'Checked-Out') return 'Checked-Out';
  if (inS === 'Checked-In') return 'Checked-In';
  if (legacyStatus === 'Confirmed') return 'Confirmed';
  if (legacyStatus === 'Approved') return 'Approved';
  return 'Pending';
}

bookingSchema.pre('validate', function syncCheckInOutStatusFields(next) {
  try {
    // Datetime compatibility: keep both naming schemes usable.
    // - If new fields exist, sync old ones (used by existing queries/logic).
    // - If only old fields exist (legacy bookings), expose new ones.
    if (!this.check_in_datetime && this.checkInDate) {
      this.check_in_datetime = this.checkInDate;
    }
    if (!this.check_out_datetime && this.checkOutDate) {
      this.check_out_datetime = this.checkOutDate;
    }
    if (this.check_in_datetime && !this.checkInDate) {
      this.checkInDate = this.check_in_datetime;
    }
    if (this.check_out_datetime && !this.checkOutDate) {
      this.checkOutDate = this.check_out_datetime;
    }

    this.check_in_status = normalizeCheckInStatus(this.checkInStatus);
    this.check_out_status = normalizeCheckOutStatus(this.checkOutStatus);

    // Primary status synchronization:
    // - If booking_status is set, it wins.
    // - Otherwise infer from legacy fields (existing DB rows).
    if (!this.booking_status) {
      this.booking_status = inferPrimaryStatusFromLegacyFields(this);
    } else {
      this.booking_status = normalizePrimaryStatus(this.booking_status);
    }

    // Keep legacy fields in sync for older clients.
    // Note: legacy `status` cannot represent Checked-In/Checked-Out, but we still preserve check-in/out flags.
    if (this.booking_status === 'Checked-In') {
      this.checkInStatus = 'Checked-In';
      this.check_in_status = 'Checked-In';
      this.checkOutStatus = 'Pending';
      this.check_out_status = 'Pending';
      this.status = 'Confirmed';
    } else if (this.booking_status === 'Checked-Out') {
      this.checkInStatus = 'Checked-In';
      this.check_in_status = 'Checked-In';
      this.checkOutStatus = 'Checked-Out';
      this.check_out_status = 'Checked-Out';
      this.status = 'Confirmed';
    } else if (this.booking_status === 'Completed') {
      this.status = 'Completed';
    } else if (this.booking_status === 'Cancelled') {
      this.status = 'Cancelled';
    } else if (this.booking_status === 'Rejected') {
      this.status = 'Rejected';
    } else if (this.booking_status === 'Approved') {
      this.status = 'Approved';
    } else if (this.booking_status === 'Confirmed') {
      this.status = 'Confirmed';
    } else if (this.booking_status === 'Pending') {
      this.status = 'Pending';
    }
    next();
  } catch (e) {
    next(e);
  }
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
