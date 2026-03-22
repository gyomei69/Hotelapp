import React, { useState, useEffect } from 'react';
import { Plus, Wifi, Tv, Coffee, Search, Filter } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    Available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Occupied: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Cleaning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Maintenance: 'bg-rose-50 text-rose-700 ring-rose-600/20'
  };

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Rooms Status</h1>
          <p className="text-slate-500 mt-2">Monitor and manage property availability</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none justify-center items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors shadow-sm inline-flex">
            Categories
          </button>
          {user?.role === 'admin' && (
             <button className="flex-1 sm:flex-none justify-center items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 inline-flex">
               <Plus size={20} />
               <span>Add Room</span>
             </button>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0 hide-scrollbar gap-2">
        {['All Rooms', 'Available', 'Occupied', 'Cleaning', 'Maintenance'].map((filter, i) => (
          <button 
            key={i}
            className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              i === 0 
              ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
             <p className="text-slate-500 col-span-full">Loading Rooms...</p>
        ) : rooms.map((room) => (
          <div key={room._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{room.roomNumber}</h3>
                  <p className="text-sm font-medium text-slate-500">{room.type}</p>
                </div>
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${statusColors[room.status]}`}>
                  {room.status}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-6 text-slate-400">
                <div className="flex items-center gap-1.5"><Wifi size={16} /></div>
                <div className="flex items-center gap-1.5"><Tv size={16} /></div>
                <div className="flex items-center gap-1.5"><Coffee size={16} /></div>
              </div>

              <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">Price / night</p>
                  <p className="text-lg font-bold text-slate-900">${room.price}</p>
                </div>
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
