/**
 * Automated API Test Script for the Hotel Booking System
 *
 * Tests the full booking flow:
 *   1. Login as user & admin
 *   2. Fetch rooms
 *   3. Create a booking (user)  → verify Pending status
 *   4. Double-book same room    → verify rejection
 *   5. Get user booking history → verify booking present
 *   6. Admin: list all bookings
 *   7. Admin: get booking by ID
 *   8. Admin: approve booking   → verify Approved status
 *   9. User: verify status updated
 *  10. Admin: reject already-approved booking → verify error
 *  11. Non-admin tries admin route → verify 403
 *
 * Usage:
 *   1. Ensure MongoDB is running and seeded (node seed.js)
 *   2. Start the server (npm run dev)
 *   3. Run: node test-booking-api.js
 */

const BASE = 'http://localhost:5000/api';

// ── Helpers ─────────────────────────────────────────────────────────

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

// ── Tests ───────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🏨 Hotel Booking API Tests\n');

  // 1. Login as admin
  console.log('1. Login as admin');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@hotel.com',
    password: 'password123',
  });
  assert(adminLogin.status === 200, 'Admin login OK');
  assert(adminLogin.data?.role === 'admin', 'Admin role confirmed');
  const adminToken = adminLogin.data?.token;

  // 2. Login as user
  console.log('\n2. Login as user');
  const userLogin = await request('POST', '/auth/login', {
    email: 'user@hotel.com',
    password: 'password123',
  });
  assert(userLogin.status === 200, 'User login OK');
  assert(userLogin.data?.role === 'user', 'User role confirmed');
  const userToken = userLogin.data?.token;

  // 3. Fetch rooms
  console.log('\n3. Fetch rooms');
  const roomsRes = await request('GET', '/rooms', null, userToken);
  assert(roomsRes.status === 200, 'Rooms fetched');
  assert(Array.isArray(roomsRes.data) && roomsRes.data.length > 0, 'Rooms available');
  const testRoom = roomsRes.data[0];
  console.log(`   Using room: ${testRoom.roomNumber} (${testRoom.type}) — ₱${testRoom.price}/night`);

  // 4. Create booking (user)
  console.log('\n4. Create booking as user');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const checkIn = futureDate.toISOString().split('T')[0];
  futureDate.setDate(futureDate.getDate() + 3);
  const checkOut = futureDate.toISOString().split('T')[0];

  const createRes = await request('POST', '/bookings', {
    room: testRoom._id,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guestCount: 2,
    paymentMethod: 'Card',
    specialRequests: 'Test booking — late check-in',
  }, userToken);
  assert(createRes.status === 201, `Booking created (status ${createRes.status})`);
  assert(createRes.data?.status === 'Pending', 'Status is Pending');
  assert(createRes.data?.totalAmount === testRoom.price * 3, `Total = ${testRoom.price} × 3 = ${testRoom.price * 3}`);
  const bookingId = createRes.data?._id;

  // 5. Double-book same room (should fail)
  console.log('\n5. Double-book same room — should fail');
  const dupeRes = await request('POST', '/bookings', {
    room: testRoom._id,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guestCount: 1,
    paymentMethod: 'Cash',
  }, userToken);
  assert(dupeRes.status === 400, `Double booking rejected (${dupeRes.status})`);

  // 6. User booking history
  console.log('\n6. User booking history');
  const myRes = await request('GET', '/bookings/my', null, userToken);
  assert(myRes.status === 200, 'History fetched');
  const myBooking = myRes.data?.find(b => b._id === bookingId);
  assert(!!myBooking, 'New booking appears in history');
  assert(myBooking?.status === 'Pending', 'Status still Pending');

  // 7. Admin: list all bookings
  console.log('\n7. Admin: list all bookings');
  const adminListRes = await request('GET', '/admin/bookings', null, adminToken);
  assert(adminListRes.status === 200, 'Admin booking list OK');
  assert(Array.isArray(adminListRes.data), 'Returns array');

  // 8. Admin: get booking by ID
  console.log('\n8. Admin: get booking details');
  const detailRes = await request('GET', `/admin/bookings/${bookingId}`, null, adminToken);
  assert(detailRes.status === 200, 'Detail fetched');
  assert(detailRes.data?.user?.email === 'user@hotel.com', 'User info populated');
  assert(detailRes.data?.room?.roomNumber === testRoom.roomNumber, 'Room info populated');

  // 9. Admin: approve booking
  console.log('\n9. Admin: approve booking');
  const approveRes = await request('PATCH', `/admin/bookings/${bookingId}`, {
    status: 'Approved',
  }, adminToken);
  assert(approveRes.status === 200, 'Approve succeeded');
  assert(approveRes.data?.status === 'Approved', 'Status is now Approved');

  // 10. User: verify status updated
  console.log('\n10. User verifies status updated');
  const myRes2 = await request('GET', '/bookings/my', null, userToken);
  const updatedBooking = myRes2.data?.find(b => b._id === bookingId);
  assert(updatedBooking?.status === 'Approved', 'User sees Approved status');

  // 11. Admin: try to approve again (should fail — not Pending)
  console.log('\n11. Re-approve already Approved booking — should fail');
  const reApproveRes = await request('PATCH', `/admin/bookings/${bookingId}`, {
    status: 'Approved',
  }, adminToken);
  assert(reApproveRes.status === 400, `Re-approve rejected (${reApproveRes.status})`);

  // 12. Non-admin tries admin route (should fail)
  console.log('\n12. Non-admin tries admin route — should fail');
  const forbiddenRes = await request('GET', '/admin/bookings', null, userToken);
  assert(forbiddenRes.status === 403, `Forbidden for non-admin (${forbiddenRes.status})`);

  // 13. Invalid booking data
  console.log('\n13. Validation: invalid dates');
  const badDatesRes = await request('POST', '/bookings', {
    room: testRoom._id,
    checkInDate: checkOut,
    checkOutDate: checkIn, // reversed
    guestCount: 1,
  }, userToken);
  assert(badDatesRes.status === 400, `Invalid dates rejected (${badDatesRes.status})`);

  // ── Summary ─────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═'.repeat(50) + '\n');

  // Clean up: delete the test booking
  if (bookingId) {
    await request('DELETE', `/admin/bookings/${bookingId}`, null, adminToken);
    console.log('🧹 Cleaned up test booking\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('❌ Test runner error:', err.message);
  process.exit(1);
});
