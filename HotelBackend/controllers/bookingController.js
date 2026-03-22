import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';

export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('guest', 'name email')
      .populate('room', 'roomNumber type price');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { guest, room, checkInDate, checkOutDate, totalAmount } = req.body;
    
    // Update Room Status
    const roomDoc = await Room.findById(room);
    if(roomDoc) {
      roomDoc.status = 'Occupied';
      await roomDoc.save();
    }

    // Update Guest stats
    const guestDoc = await Guest.findById(guest);
    if(guestDoc) {
      guestDoc.totalBookings += 1;
      guestDoc.totalSpent += Number(totalAmount);
      await guestDoc.save();
    }

    const booking = new Booking({
      guest, room, checkInDate, checkOutDate, totalAmount
    });

    const createdBooking = await booking.save();
    res.status(201).json(createdBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (booking) {
      booking.status = req.body.status || booking.status;
      const updatedBooking = await booking.save();
      
      // If completed or cancelled, free the room
      if (req.body.status === 'Completed' || req.body.status === 'Cancelled') {
        const roomDoc = await Room.findById(booking.room);
        if(roomDoc) {
          roomDoc.status = 'Available';
          await roomDoc.save();
        }
      }

      res.json(updatedBooking);
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
     const booking = await Booking.findById(req.params.id);
     if(booking) {
       await booking.deleteOne();
       res.json({ message: 'Booking removed' });
     } else {
       res.status(404).json({ message: 'Booking not found' });
     }
  } catch (error) {
     res.status(500).json({ message: error.message });
  }
};
