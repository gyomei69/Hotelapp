import ActivityLog from '../models/ActivityLog.js';
import { STAFF_EXCLUDED_ACTIONS } from '../constants/activityActions.js';

const ALLOWED_FILTER_ROLES = ['admin', 'staff', 'guest'];

/**
 * @desc   Activity audit trail (admin: full; staff: excludes admin-only actions)
 * @route  GET /api/activity-logs?role=admin|staff|guest
 * @access Staff + super admin
 */
export const listActivityLogs = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (!isAdmin) {
      filter.action = { $nin: STAFF_EXCLUDED_ACTIONS };
    }

    const roleParam = typeof req.query.role === 'string' ? req.query.role.toLowerCase() : '';
    if (roleParam && ALLOWED_FILTER_ROLES.includes(roleParam)) {
      filter.role = roleParam;
    }

    const [totalItems, rows] = await Promise.all([
      ActivityLog.countDocuments(filter),
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name')
        .lean(),
    ]);

    const logs = rows.map((r) => ({
      _id: r._id,
      role: r.role,
      action: r.action,
      description: r.description,
      relatedId: r.relatedId,
      createdAt: r.createdAt,
      actorName: r.userId?.name || 'User',
    }));

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    res.json({
      data: logs,
      // Backward-compatible alias for older clients:
      logs,
      currentPage: page,
      totalPages,
      totalItems,
    });
  } catch (error) {
    console.error('[listActivityLogs]', error.message);
    res.status(500).json({ message: error.message || 'Could not load activity logs' });
  }
};
