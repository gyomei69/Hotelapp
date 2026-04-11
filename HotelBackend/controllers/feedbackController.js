import Feedback from '../models/Feedback.js';

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
    res.status(201).json(doc);
  } catch (error) {
    console.error('[createFeedback]', error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * @desc    Super admin lists all feedback
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
 * @desc    Super admin responds to feedback
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
    res.json(updated);
  } catch (error) {
    console.error('[respondFeedback]', error.message);
    res.status(400).json({ message: error.message });
  }
};
