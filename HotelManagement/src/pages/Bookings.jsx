import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings');
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBooking = async (id) => {
    if(!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      fetchBookings();
    } catch (error) {
      console.error('Failed to delete booking', error);
      alert('Must be admin to delete bookings.');
    }
  };

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-slate-500 mt-2">Manage all reservations and guest stays</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
          <Plus size={20} />
          <span>Add Booking</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search guests or booking ID..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
          </div>
          <button className="flex items-center gap-2 text-slate-600 font-medium px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
            <Filter size={18} />
            <span>Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl truncate">Guest</th>
                <th className="px-6 py-4">Room Type</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                 <tr><td colSpan="7" className="text-center py-8">Loading Bookings...</td></tr>
              ) : bookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold uppercase">
                        {booking.guest?.name?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{booking.guest?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{booking._id.substring(18,24).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{booking.room?.type || 'N/A'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{booking.room?.roomNumber || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{new Date(booking.checkInDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(booking.checkOutDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">${booking.totalAmount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                      booking.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                      booking.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteBooking(booking._id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2">
                       <Trash2 size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
