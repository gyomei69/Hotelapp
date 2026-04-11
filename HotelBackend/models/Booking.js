import mongoose from 'mongoose';

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
    checkInStatus: {
      type: String,
      enum: ['pending', 'checked_in'],
      default: 'pending',
    },
    checkOutStatus: {
      type: String,
      enum: ['pending', 'checked_out'],
      default: 'pending',
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

bookingSchema.virtual('notes').get(function () {
  return this.specialRequests;
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
