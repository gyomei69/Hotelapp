/**
 * In-app notification tap → tab navigation (guest shell).
 * @param {(tab: string) => void} setActiveTab
 * @param {{ type?: string; relatedId?: string }} item
 */
export function handleGuestNotificationNavigate(setActiveTab, item) {
  if (typeof setActiveTab !== 'function') return;
  const t = String(item?.type || '');
  if (t === 'FEEDBACK_REPLY') {
    setActiveTab('profile');
    return;
  }
  if (item?.relatedId) setActiveTab('mybookings');
}

/**
 * Staff / admin shell: booking-related → Bookings; new guest feedback → Feedback tab (staff) or Manage (admin).
 */
export function handleStaffNotificationNavigate(setActiveTab, isSuperAdmin, item) {
  if (typeof setActiveTab !== 'function') return;
  const t = String(item?.type || '');
  if (t === 'FEEDBACK_NEW' || t === 'FEEDBACK_RESPONSE_SENT') {
    if (isSuperAdmin) setActiveTab('manage');
    else setActiveTab('feedback');
    return;
  }
  if (t.startsWith('ROOM_')) {
    setActiveTab('rooms');
    return;
  }
  if (item?.relatedId) setActiveTab('guests');
}
