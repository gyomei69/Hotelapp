import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Standard', 'Deluxe', 'Suite', 'Ocean View', 'Penthouse'],
    },
    /** Catalog type key (kept in sync with `type`); used for pool availability. */
    roomType: {
      type: String,
      enum: ['Standard', 'Deluxe', 'Suite', 'Ocean View', 'Penthouse'],
    },
    /** How many physical rooms exist for this room type (shared pool across rows of the same type). */
    totalRooms: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 4,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance', 'Unavailable'],
      default: 'Available',
    },
    features: [String],
    imageUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

roomSchema.pre('save', function syncRoomType(next) {
  if (!this.roomType && this.type) {
    this.roomType = this.type;
  }
  next();
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
