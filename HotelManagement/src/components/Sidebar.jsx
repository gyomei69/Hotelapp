import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, BedDouble, Users, Sparkles, CreditCard, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const { user, logout } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Bookings', path: '/bookings', icon: CalendarDays },
    { name: 'Rooms', path: '/rooms', icon: BedDouble },
    { name: 'Guests', path: '/guests', icon: Users },
    { name: 'Housekeeping', path: '/housekeeping', icon: Sparkles },
    { name: 'Billing', path: '/billing', icon: CreditCard },
  ];

  if (user?.role === 'admin') {
     navItems.push({ name: 'System Users', path: '/users', icon: Shield });
  }
  navItems.push({ name: 'Settings', path: '/settings', icon: Settings });

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-10 transition-transform duration-300 hidden md:flex md:flex-col">
      <div className="flex h-16 items-center flex-shrink-0 px-6 border-b border-slate-100">
        <div className="flex items-center gap-2 text-indigo-600">
          <Sparkles size={24} className="fill-indigo-600" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">GrandHotel</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col hide-scrollbar">
        <nav className="flex-1 space-y-1 relative">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
             {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Staff User'}</p>
            <p className="text-xs text-slate-500 font-medium capitalize">{user?.role || 'staff'}</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center space-x-3 w-full text-left text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors">
          <LogOut size={20} className="text-rose-500 shrink-0" />
          <span className="font-semibold text-sm truncate">Log Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
