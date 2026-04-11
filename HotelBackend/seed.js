// Fix DNS resolution for MongoDB Atlas SRV records
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Room from './models/Room.js';
import Guest from './models/Guest.js';
import Booking from './models/Booking.js';
import Housekeeping from './models/Housekeeping.js';
import Feedback from './models/Feedback.js';

dotenv.config();

/** Must match `DELUXE_ROOM_IMAGE_URL` in app `src/utils/roomImages.js` (Unsplash id must stay valid). */
const DELUXE_IMAGE =
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel-mgmt')
  .then(async () => {
    console.log('Connected to MongoDB manually for seeding...');

    // Clear DB
    await User.deleteMany();
    await Room.deleteMany();
    await Guest.deleteMany();
    await Booking.deleteMany();
    await Housekeeping.deleteMany();
    await Feedback.deleteMany();

    // Super admin + staff + guest
    const adminUser = await User.create({
      name: 'Super Admin',
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

    const standardUser = await User.create({
      name: 'Guest User',
      email: 'user@hotel.com',
      password: 'password123',
      role: 'guest',
    });

    // Create Rooms (Standard 101 removed per product spec — keep 102 and others)
    const rooms = await Room.insertMany([
      {
        roomNumber: '102',
        type: 'Standard',
        price: 150,
        capacity: 2,
        status: 'Available',
        description: 'Bright and airy standard room with garden views. Features a dedicated workspace and premium linens.',
        imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      },
      {
        roomNumber: '201',
        type: 'Deluxe',
        price: 250,
        capacity: 3,
        status: 'Available',
        description: 'Spacious deluxe room with a king-sized bed and a private balcony. Experience luxury with a walk-in rain shower and plush bathrobes.',
        imageUrl: DELUXE_IMAGE,
      },
      {
        roomNumber: '301',
        type: 'Suite',
        price: 400,
        capacity: 4,
        status: 'Available',
        description: 'Elegant suite featuring a separate living area and panoramic city views. The ultimate choice for business or leisure travelers seeking extra space.',
        imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      },
      {
        roomNumber: '401',
        type: 'Penthouse',
        price: 850,
        capacity: 6,
        status: 'Available',
        description: 'The pinnacle of luxury. Our top-floor penthouse offers a private terrace, personal butler service, and a fully-equipped gourmet kitchen.',
        imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      },
    ]);

    await Housekeeping.insertMany(
      rooms.map((r) => ({
        room: r._id,
        status: 'clean',
      }))
    );

    // Create Guests
    const guests = await Guest.insertMany([
      { name: 'John Doe', email: 'john@example.com', phone: '555-1234', status: 'Active', totalSpent: 450, totalBookings: 1 },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678', status: 'Active', totalSpent: 0, totalBookings: 0 },
    ]);

    // Create Bookings (linked to user and guest)
    await Booking.create([
      {
        user: standardUser._id,
        guest: guests[0]._id,
        room: rooms[0]._id,
        checkInDate: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000),
        checkOutDate: new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000),
        totalAmount: 450,
        guestCount: 2,
        paymentMethod: 'Card',
        specialRequests: 'Late check-in please',
        status: 'Pending',
      },
      {
        user: standardUser._id,
        guest: guests[0]._id,
        room: rooms[1]._id,
        checkInDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        checkOutDate: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000),
        totalAmount: 750,
        guestCount: 1,
        paymentMethod: 'Card',
        status: 'Approved',
      },
    ]);

    console.log('✅ Base Data Imported Successfully!');
    process.exit();
  })
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
