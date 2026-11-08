import Room from '../models/Room.js';
import { notifyAdminRecipients } from '../services/notificationService.js';

// @desc    Fetch all rooms
// @route   GET /api/rooms
// @access  Private
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({});
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a room
// @route   POST /api/rooms
// @access  Private/Admin
export const createRoom = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.price !== undefined) payload.price = Number(payload.price);
    if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);
    if (payload.totalRooms !== undefined) payload.totalRooms = Number(payload.totalRooms);
    const room = new Room(payload);
    const createdRoom = await room.save();
    try {
      await notifyAdminRecipients({
        type: 'ROOM_CREATED',
        message: `New room added: ${createdRoom.type} ${createdRoom.roomNumber}`,
        relatedId: createdRoom._id,
        excludeUserIds: req.user?._id ? [req.user._id] : [],
      });
    } catch (e) {
      console.warn('[createRoom] notify failed', e?.message || e);
    }
    res.status(201).json(createdRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (room) {
      room.roomNumber = req.body.roomNumber || room.roomNumber;
      room.type = req.body.type || room.type;
      if (req.body.roomType !== undefined) room.roomType = req.body.roomType;
      room.price = req.body.price != null ? Number(req.body.price) : room.price;
      room.capacity =
        req.body.capacity != null ? Number(req.body.capacity) : room.capacity;
      if (req.body.totalRooms != null) room.totalRooms = Number(req.body.totalRooms);
      room.description =
        req.body.description !== undefined ? req.body.description : room.description;
      room.status = req.body.status || room.status;
      room.features = req.body.features || room.features;
      room.imageUrl = req.body.imageUrl || room.imageUrl;

      const updatedRoom = await room.save();
      try {
        await notifyAdminRecipients({
          type: 'ROOM_UPDATED',
          message: `Room updated: ${updatedRoom.type} ${updatedRoom.roomNumber}`,
          relatedId: updatedRoom._id,
          excludeUserIds: req.user?._id ? [req.user._id] : [],
        });
      } catch (e) {
        console.warn('[updateRoom] notify failed', e?.message || e);
      }
      res.json(updatedRoom);
    } else {
      res.status(404).json({ message: 'Room not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (room) {
      const rid = room._id;
      const label = `${room.type} ${room.roomNumber}`;
      await room.deleteOne();
      try {
        await notifyAdminRecipients({
          type: 'ROOM_DELETED',
          message: `Room removed: ${label}`,
          relatedId: rid,
          excludeUserIds: req.user?._id ? [req.user._id] : [],
        });
      } catch (e) {
        console.warn('[deleteRoom] notify failed', e?.message || e);
      }
      res.json({ message: 'Room removed' });
    } else {
      res.status(404).json({ message: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
