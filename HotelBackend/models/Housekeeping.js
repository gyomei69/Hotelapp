import mongoose from 'mongoose';

const housekeepingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    status: {
      type: String,
      enum: ['clean', 'dirty', 'in_progress'],
      default: 'clean',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

housekeepingSchema.index({ room: 1 });

const Housekeeping = mongoose.model('Housekeeping', housekeepingSchema);
export default Housekeeping;
