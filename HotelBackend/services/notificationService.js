import Notification from '../models/Notification.js';
import User from '../models/User.js';

const ADMIN_ROLES = ['admin', 'staff'];

/**
 * Fan-out one in-app notification per admin/staff recipient (adminId set, userId null).
 */
export async function notifyAdminRecipients({ type, message, relatedId }) {
  const recipients = await User.find({ role: { $in: ADMIN_ROLES } }).select('_id').lean();
  if (!recipients.length) return;
  await Notification.insertMany(
    recipients.map((u) => ({
      userId: null,
      adminId: u._id,
      type,
      message,
      relatedId: relatedId ?? null,
      isRead: false,
    }))
  );
}

/** User-targeted notification (userId set, adminId null). */
export async function notifyUser({ userId, type, message, relatedId }) {
  if (!userId) return;
  await Notification.create({
    userId,
    adminId: null,
    type,
    message,
    relatedId: relatedId ?? null,
    isRead: false,
  });
}