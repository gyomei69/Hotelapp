import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/** Normalize role from DB (handles legacy casing / whitespace). */
const normalizedRole = (user) => {
  if (!user || typeof user.role !== 'string') return '';
  return user.role.trim().toLowerCase();
};

/** Admin role only — full system control. */
export const requireAdmin = (req, res, next) => {
  if (normalizedRole(req.user) === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};

/** Roles allowed for shared staff shell: dashboard, bookings ops, guests list, etc. */
export const ROLES_ADMIN_STAFF = ['admin', 'staff'];

/**
 * Reusable role guard (normalized match).
 * @param {string[]} allowedRoles
 * @param {string} [message='Access denied']
 */
export const requireRole = (allowedRoles, message = 'Access denied') => {
  const allowed = allowedRoles.map((r) => String(r).trim().toLowerCase());
  return (req, res, next) => {
    const role = normalizedRole(req.user);
    if (req.user && allowed.includes(role)) {
      return next();
    }
    return res.status(403).json({ message });
  };
};

/** Staff or admin — operational hotel tools (bookings list, payments, check-in, etc.). */
export const requireStaffAccess = requireRole(ROLES_ADMIN_STAFF, 'Staff access required');
