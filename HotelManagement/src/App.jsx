import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Rooms from './pages/Rooms';
import Guests from './pages/Guests';
import Billing from './pages/Billing';
import Login from './pages/Login';
import Users from './pages/Users';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
             <Route path="/" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="rooms" element={<Rooms />} />
                <Route path="guests" element={<Guests />} />
                <Route path="billing" element={<Billing />} />
                <Route path="users" element={<Users />} />
                <Route path="housekeeping" element={<div className="p-8 text-center text-gray-500">Housekeeping Module Under Construction</div>} />
                <Route path="settings" element={<div className="p-8 text-center text-gray-500">Settings Module Under Construction</div>} />
             </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
