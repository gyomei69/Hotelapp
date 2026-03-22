import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Room from './models/Room.js';
import Guest from './models/Guest.js';
import Booking from './models/Booking.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel-mgmt')
  .then(async () => {
    console.log('Connected to MongoDB manually for seeding...');

    // Clear DB
    await User.deleteMany();
    await Room.deleteMany();
    await Guest.deleteMany();
    await Booking.deleteMany();

    // Create Admin and Staff
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@hotel.com',
      password: 'password123',
      role: 'admin',
    });

    const staffUser = await User.create({
      name: 'Staff Member',
      email: 'staff@hotel.com',
      password: 'password123',
      role: 'staff',
    });

    // Create Rooms
    const rooms = await Room.insertMany([
      { roomNumber: '101', type: 'Standard', price: 150, status: 'Available' },
      { roomNumber: '102', type: 'Standard', price: 150, status: 'Occupied' },
      { roomNumber: '201', type: 'Deluxe', price: 250, status: 'Cleaning' },
      { roomNumber: '301', type: 'Suite', price: 400, status: 'Available' },
      { roomNumber: '401', type: 'Penthouse', price: 850, status: 'Available' },
    ]);

    // Create Guests
    const guests = await Guest.insertMany([
      { name: 'John Doe', email: 'john@example.com', phone: '555-1234', status: 'Active', totalSpent: 450, totalBookings: 1 },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678', status: 'Active', totalSpent: 0, totalBookings: 0 },
    ]);

    // Create Bookings
    await Booking.create([
       {
         guest: guests[0]._id,
         room: rooms[1]._id,
         checkInDate: new Date(),
         checkOutDate: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000), // +3 days
         totalAmount: 450,
         status: 'Confirmed'
       }
    ]);

    console.log('✅ Base Data Imported Successfully!');
    process.exit();
  })
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
