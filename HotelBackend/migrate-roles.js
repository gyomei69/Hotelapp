/**
 * One-time migration: legacy roles to admin / staff / guest
 * Run: node migrate-roles.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const SUPER_ADMIN_EMAIL =
  (process.env.SUPER_ADMIN_EMAIL || 'admin@hotel.com').toLowerCase().trim();

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel-mgmt';
  await mongoose.connect(uri, { family: 4 });
  console.log('Connected. Migrating roles...');

  const col = mongoose.connection.collection('users');

  const r1 = await col.updateMany({ role: 'user' }, { $set: { role: 'guest' } });
  console.log('user→guest modified:', r1.modifiedCount);

  const r2 = await col.updateMany({ role: 'admin' }, { $set: { role: 'staff' } });
  console.log('admin→staff modified:', r2.modifiedCount);

  const sup = await col.updateOne({ email: SUPER_ADMIN_EMAIL }, { $set: { role: 'admin' } });
  console.log('Super admin restore matched:', sup.matchedCount);

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
