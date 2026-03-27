// Fix DNS resolution for MongoDB Atlas SRV records
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

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

    const standardUser = await User.create({
      name: 'Standard User',
      email: 'user@hotel.com',
      password: 'password123',
      role: 'user',
    });

    // Create Rooms
    const rooms = await Room.insertMany([
      {
        roomNumber: '101',
        type: 'Standard',
        price: 150,
        status: 'Available',
        description: 'A cozy and modern room with a queen-sized bed, perfect for solo travelers or couples. Includes high-speed WiFi and a smart TV.',
        imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80'
      },
      {
        roomNumber: '102',
        type: 'Standard',
        price: 150,
        status: 'Available',
        description: 'Bright and airy standard room with garden views. Features a dedicated workspace and premium linens.',
        imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'
      },
      {
        roomNumber: '201',
        type: 'Deluxe',
        price: 250,
        status: 'Available',
        description: 'Spacious deluxe room with a king-sized bed and a private balcony. Experience luxury with a walk-in rain shower and plush bathrobes.',
        imageUrl: 'https://images.unsplash.com/photo-1591088398332-8a77d399c843?auto=format&fit=crop&w=800&q=80'
      },
      {
        roomNumber: '301',
        type: 'Suite',
        price: 400,
        status: 'Available',
        description: 'Elegant suite featuring a separate living area and panoramic city views. The ultimate choice for business or leisure travelers seeking extra space.',
        imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
      },
      {
        roomNumber: '401',
        type: 'Penthouse',
        price: 850,
        status: 'Available',
        description: 'The pinnacle of luxury. Our top-floor penthouse offers a private terrace, personal butler service, and a fully-equipped gourmet kitchen.',
        imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
      },
    ]);

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
         room: rooms[1]._id,
         checkInDate: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
         checkOutDate: new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000), // +4 days
         totalAmount: 450,
         guestCount: 2,
         paymentMethod: 'Card',
         specialRequests: 'Late check-in please',
         status: 'Pending'
       },
       {
         user: standardUser._id,
         guest: guests[0]._id,
         room: rooms[2]._id,
         checkInDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // +7 days
         checkOutDate: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000), // +10 days
         totalAmount: 750,
         guestCount: 1,
         paymentMethod: 'Online',
         status: 'Approved'
       }
    ]);

    console.log('✅ Base Data Imported Successfully!');
    process.exit();
  })
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
