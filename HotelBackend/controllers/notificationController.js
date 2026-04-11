import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

const isStaffLike = (user) => user && (user.role === 'admin' || user.role === 'staff');

/**
 * @desc    List notifications for current user or admin/staff inbox
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res) => {
  try {
    const filter = isStaffLike(req.user)
      ? { adminId: req.user._id }
      : { userId: req.user._id };

    const list = await Notification.find(filter).sort({ createdAt: -1 }).lean();

    const unreadCount = list.filter((n) => !n.isRead).length;

    res.json({
      notifications: list.map((n) => ({
        _id: n._id,
        userId: n.userId,
        adminId: n.adminId,
        type: n.type,
        message: n.message,
        relatedId: n.relatedId,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('[getNotifications]', error.message);
    res.status(500).json({ message: error.message || 'Failed to load notifications' });
  }
};

/**
 * @desc    Mark one notification as read (must belong to current user)
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const doc = await Notification.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const uid = req.user._id.toString();
    const ownsAsUser = doc.userId && doc.userId.toString() === uid;
    const ownsAsAdmin = doc.adminId && doc.adminId.toString() === uid;

    if (!ownsAsUser && !ownsAsAdmin) {
      return res.status(403).json({ message: 'Not allowed to update this notification' });
    }

    doc.isRead = true;
    await doc.save();

    res.json({
      _id: doc._id,
      userId: doc.userId,
      adminId: doc.adminId,
      type: doc.type,
      message: doc.message,
      relatedId: doc.relatedId,
      isRead: doc.isRead,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error('[markNotificationRead]', error.message);
    res.status(500).json({ message: error.message || 'Failed to update notification' });
  }
};
