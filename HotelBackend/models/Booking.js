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
      required: true,
      enum: ['Cash', 'Card', 'Online'],
      default: 'Cash',
    },
    specialRequests: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

// Compound index to speed up overlap queries for double-booking prevention
bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });

// Virtual alias so `notes` maps to `specialRequests`
bookingSchema.virtual('notes').get(function () {
  return this.specialRequests;
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
