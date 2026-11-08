import Feedback from '../models/Feedback.js';
import { notifyAdminRecipients, notifyUser } from '../services/notificationService.js';

/**
 * @desc    Guest submits feedback
 * @route   POST /api/feedback
 */
export const createFeedback = async (req, res) => {
  try {
    if (req.user.role !== 'guest') {
      return res.status(403).json({ message: 'Only guests can submit feedback' });
    }
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length < 3) {
      return res.status(400).json({ message: 'Please enter a message (at least 3 characters)' });
    }
    const doc = await Feedback.create({
      user: req.user._id,
      message,
    });
    const guestName = req.user?.name || req.user?.email || 'A guest';
    try {
      await notifyAdminRecipients({
        type: 'FEEDBACK_NEW',
        message: `${guestName} sent feedback`,
        relatedId: doc._id,
      });
    } catch (e) {
      console.warn('[createFeedback] notify staff failed', e?.message || e);
    }
    res.status(201).json(doc);
  } catch (error) {
    console.error('[createFeedback]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    List guest feedback (staff + admin)
 * @route   GET /api/admin/feedback
 */
export const listFeedbackAdmin = async (req, res) => {
  try {
    const list = await Feedback.find()
      .populate('user', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (error) {
    console.error('[listFeedbackAdmin]', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Staff or admin responds to guest feedback
 * @route   PATCH /api/admin/feedback/:id/respond
 */
export const respondFeedback = async (req, res) => {
  try {
    const response = typeof req.body.response === 'string' ? req.body.response.trim() : '';
    if (!response) {
      return res.status(400).json({ message: 'Response text is required' });
    }
    const doc = await Feedback.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    doc.response = response;
    doc.respondedAt = new Date();
    doc.respondedBy = req.user._id;
    await doc.save();
    const updated = await Feedback.findById(doc._id)
      .populate('user', 'name email')
      .populate('respondedBy', 'name email')
      .lean();

    try {
      const responder = req.user?.name || req.user?.email || 'Hotel team';
      await notifyUser({
        userId: doc.user,
        type: 'FEEDBACK_REPLY',
        message: `${responder} replied to your feedback`,
        relatedId: doc._id,
      });
    } catch (e) {
      console.warn('[respondFeedback] notify guest failed', e?.message || e);
    }

    try {
      await notifyAdminRecipients({
        type: 'FEEDBACK_RESPONSE_SENT',
        message: `${req.user?.name || 'Staff'} replied to guest feedback`,
        relatedId: doc._id,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[respondFeedback] notify staff team failed', e?.message || e);
    }

    res.json(updated);
  } catch (error) {
    console.error('[respondFeedback]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Staff or admin deletes a feedback entry
 * @route   DELETE /api/admin/feedback/:id
 */
export const deleteFeedback = async (req, res) => {
  try {
    const doc = await Feedback.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    const feedbackId = doc._id;
    const guestId = doc.user;
    await doc.deleteOne();

    try {
      await notifyUser({
        userId: guestId,
        type: 'FEEDBACK_DELETED',
        message: 'Your feedback was removed by the hotel team',
        relatedId: feedbackId,
      });
    } catch (e) {
      console.warn('[deleteFeedback] notify guest failed', e?.message || e);
    }

    try {
      await notifyAdminRecipients({
        type: 'FEEDBACK_DELETED_TEAM',
        message: `${req.user?.name || 'Staff'} deleted a guest feedback entry`,
        relatedId: feedbackId,
        excludeUserIds: [req.user._id],
      });
    } catch (e) {
      console.warn('[deleteFeedback] notify team failed', e?.message || e);
    }

    return res.json({ message: 'Feedback deleted', id: String(feedbackId) });
  } catch (error) {
    console.error('[deleteFeedback]', error.message);
    return res.status(400).json({ message: error.message });
  }
};
