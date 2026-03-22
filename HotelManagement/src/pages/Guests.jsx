import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Mail, Phone } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Guests() {
  const { user } = useAuth();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const { data } = await api.get('/guests');
      setGuests(data);
    } catch (error) {
      console.error('Failed to fetch guests', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Guest Directory</h1>
          <p className="text-slate-500 mt-2">Manage customer profiles and history</p>
        </div>
        {user?.role === 'admin' && (
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
            <Plus size={20} />
            <span>Add Guest</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, email, or phone..." 
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
                <th className="px-6 py-4 rounded-tl-xl">Guest info</th>
                <th className="px-6 py-4">Total Bookings</th>
                <th className="px-6 py-4">Total Spent</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                 <tr><td colSpan="5" className="text-center py-8">Loading Guests...</td></tr>
              ) : guests.map((guest) => (
                <tr key={guest._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
                        {guest.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-base">{guest.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center text-xs text-slate-500">
                            <Mail size={12} className="mr-1 mt-0.5" /> {guest.email}
                          </span>
                          <span className="flex items-center text-xs text-slate-500">
                            <Phone size={12} className="mr-1 mt-0.5" /> {guest.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{guest.totalBookings} stays</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">${guest.totalSpent?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                      guest.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {guest.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
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
