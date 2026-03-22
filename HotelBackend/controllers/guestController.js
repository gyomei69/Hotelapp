import Guest from '../models/Guest.js';

export const getGuests = async (req, res) => {
  try {
    const guests = await Guest.find({});
    res.json(guests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createGuest = async (req, res) => {
  try {
    const guest = new Guest(req.body);
    const createdGuest = await guest.save();
    res.status(201).json(createdGuest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (guest) {
      guest.name = req.body.name || guest.name;
      guest.email = req.body.email || guest.email;
      guest.phone = req.body.phone || guest.phone;
      guest.status = req.body.status || guest.status;
      
      const updatedGuest = await guest.save();
      res.json(updatedGuest);
    } else {
      res.status(404).json({ message: 'Guest not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (guest) {
      await guest.deleteOne();
      res.json({ message: 'Guest removed' });
    } else {
      res.status(404).json({ message: 'Guest not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
