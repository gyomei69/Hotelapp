import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

const Guest = mongoose.model('Guest', guestSchema);
export default Guest;
