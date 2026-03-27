// src/services/api.js
// Centralized API client for the Hotel Management Backend
// All API calls go through this module for consistent auth & error handling.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// -------------------------------------------------------------------
// Base URL Configuration
// Physical devices need the host machine's local network IP.
// Update this IP if your network changes.
// -------------------------------------------------------------------
const LOCAL_IP = '192.168.1.25';

const getBaseUrl = () => {
  // Web can use localhost; physical devices & emulators use the local IP
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  return `http://${LOCAL_IP}:5000/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// -------------------------------------------------------------------
// Request Interceptor — auto-attach JWT token from AsyncStorage
// -------------------------------------------------------------------
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------------------
// Response Interceptor — normalize errors
// -------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with an error status
      const message = error.response.data?.message || 'Something went wrong';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Network error — no response received
      return Promise.reject(new Error('Network error. Is the server running?'));
    }
    return Promise.reject(error);
  }
);

// ===================================================================
// AUTH API
// ===================================================================

/** Login with email & password. Returns { _id, name, email, role, token } */
export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password }).then((res) => res.data);

/** Register a new user. Returns { _id, name, email, role, token } */
export const registerUser = (name, email, password, phone = '', role = 'user') =>
  api.post('/auth/register', { name, email, password, phone, role }).then((res) => res.data);

/** Google Sign-In. Sends Google ID token to backend. Returns { _id, name, email, role, token } */
export const googleSignIn = (idToken) =>
  api.post('/auth/google', { idToken }).then((res) => res.data);

/** Get current user's profile (requires auth). */
export const getProfile = () =>
  api.get('/auth/profile').then((res) => res.data);

// ===================================================================
// ROOMS API
// ===================================================================

/** Get all rooms */
export const getRooms = () =>
  api.get('/rooms').then((res) => res.data);

/** Create a room (admin only) */
export const createRoom = (roomData) =>
  api.post('/rooms', roomData).then((res) => res.data);

/** Update a room (admin only) */
export const updateRoom = (id, roomData) =>
  api.put(`/rooms/${id}`, roomData).then((res) => res.data);

/** Delete a room (admin only) */
export const deleteRoom = (id) =>
  api.delete(`/rooms/${id}`).then((res) => res.data);

// ===================================================================
// BOOKINGS API
// ===================================================================

/** Get all bookings (admin) */
export const getBookings = () =>
  api.get('/admin/bookings').then((res) => res.data);

/** Get current user's bookings only */
export const getMyBookings = () =>
  api.get('/bookings/my').then((res) => res.data);

/** Create a new booking */
export const createBooking = (bookingData) =>
  api.post('/bookings', bookingData).then((res) => res.data);

/** Update booking status (admin) — Approve or Reject */
export const updateBookingStatus = (id, status) =>
  api.patch(`/admin/bookings/${id}`, { status }).then((res) => res.data);

/** Delete a booking (admin only) */
export const deleteBooking = (id) =>
  api.delete(`/admin/bookings/${id}`).then((res) => res.data);

// ===================================================================
// GUESTS API
// ===================================================================

/** Get all guests */
export const getGuests = () =>
  api.get('/guests').then((res) => res.data);

/** Create a guest */
export const createGuest = (guestData) =>
  api.post('/guests', guestData).then((res) => res.data);

/** Update a guest */
export const updateGuest = (id, guestData) =>
  api.put(`/guests/${id}`, guestData).then((res) => res.data);

/** Delete a guest */
export const deleteGuest = (id) =>
  api.delete(`/guests/${id}`).then((res) => res.data);

// ===================================================================
// STATS API
// ===================================================================

/** Get dashboard stats (guests count, available rooms, revenue, bookings) */
export const getStats = () =>
  api.get('/stats').then((res) => res.data);

export default api;
