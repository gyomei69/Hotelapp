import React, { useEffect, useState } from 'react';
import { Users, Key, DollarSign, CalendarCheck, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';

const mockChartData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 6890 },
  { name: 'Sat', revenue: 8390 },
  { name: 'Sun', revenue: 7490 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ guests: 0, availableRooms: 0, revenue: 0, newBookings: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get('/stats');
        setStats(statsRes.data);

        const bookingsRes = await api.get('/bookings');
        const latest = bookingsRes.data.slice(-3).reverse();
        setRecentBookings(latest);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statCardsData = [
    { title: 'Total Guests', value: stats.guests.toString(), icon: Users, change: '+12%', isPositive: true },
    { title: 'Available Rooms', value: stats.availableRooms.toString(), icon: Key, change: '-2%', isPositive: false },
    { title: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, change: '+8%', isPositive: true },
    { title: 'New Bookings', value: stats.newBookings.toString(), icon: CalendarCheck, change: '+24%', isPositive: true },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8">
        <p className="text-center text-slate-500">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-2">Welcome back! Here's what's happening at your property today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCardsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                <stat.icon size={24} />
              </div>
              <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <TrendingUp size={12} className="mr-1" />
                {stat.change}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Weekly Revenue</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: '600' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Recent Bookings</h3>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">View All</button>
          </div>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking._id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold uppercase">
                    {booking.guest?.name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{booking.guest?.name || 'Guest'}</h4>
                    <p className="text-xs text-slate-500">{booking.room?.type || 'Room'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-md inline-block mb-1 ${
                    booking.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {booking.status}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(booking.checkInDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
