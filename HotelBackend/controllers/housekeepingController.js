import Room from '../models/Room.js';
import Housekeeping from '../models/Housekeeping.js';

/**
 * @desc    List housekeeping rows (one per room; creates missing rows)
 * @route   GET /api/admin/housekeeping
 */
export const listHousekeeping = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 }).lean();
    const results = [];
    for (const r of rooms) {
      let hk = await Housekeeping.findOne({ room: r._id })
        .populate('assignedTo', 'name email')
        .lean();
      if (!hk) {
        const created = await Housekeeping.create({ room: r._id, status: 'clean' });
        hk = await Housekeeping.findById(created._id).populate('assignedTo', 'name email').lean();
      }
      results.push({
        ...hk,
        roomDetails: { _id: r._id, roomNumber: r.roomNumber, type: r.type },
      });
    }
    res.json(results);
  } catch (error) {
    console.error('[listHousekeeping]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update housekeeping task (status / assignee / notes)
 * @route   PATCH /api/admin/housekeeping/:id
 */
export const updateHousekeepingTask = async (req, res) => {
  try {
    const { status, assignedTo, notes } = req.body;
    const hk = await Housekeeping.findById(req.params.id);
    if (!hk) {
      return res.status(404).json({ message: 'Housekeeping record not found' });
    }
    if (status && ['clean', 'dirty', 'in_progress'].includes(status)) {
      hk.status = status;
    }
    if (assignedTo !== undefined) {
      hk.assignedTo = assignedTo || null;
    }
    if (notes !== undefined) {
      hk.notes = typeof notes === 'string' ? notes : hk.notes;
    }
    await hk.save();
    const updated = await Housekeeping.findById(hk._id)
      .populate('assignedTo', 'name email')
      .populate('room', 'roomNumber type')
      .lean();
    res.json(updated);
  } catch (error) {
    console.error('[updateHousekeepingTask]', error.message);
    res.status(400).json({ message: error.message });
  }
};
