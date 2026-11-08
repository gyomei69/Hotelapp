import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';

const ALLOWED_ROLES = new Set(['admin', 'staff', 'guest']);

/**
 * Normalize legacy role labels for storage.
 * @param {string} role
 * @returns {'admin'|'staff'|'guest'}
 */
export function normalizeActivityRole(role) {
  if (!role || typeof role !== 'string') return 'guest';
  const r = role.toLowerCase();
  if (r === 'user') return 'guest';
  if (ALLOWED_ROLES.has(r)) return r;
  return 'guest';
}

/**
 * Persist an audit entry. Never throws — failures are logged only.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {string} role
 * @param {string} action
 * @param {string} description
 * @param {import('mongoose').Types.ObjectId|string|null|undefined} relatedId
 */
export async function logActivity(userId, role, action, description, relatedId = null) {
  try {
    if (!userId || !action || !description) return;
    const uid = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    if (!uid) return;

    let rid = null;
    if (relatedId != null && relatedId !== '' && mongoose.Types.ObjectId.isValid(relatedId)) {
      rid = relatedId;
    }

    await ActivityLog.create({
      userId: uid,
      role: normalizeActivityRole(role),
      action: String(action).slice(0, 200),
      description: String(description).slice(0, 2000),
      relatedId: rid,
    });
  } catch (e) {
    console.warn('[logActivity]', e.message);
  }
}
