import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 w-full bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-500 hover:text-slate-700">
          <Menu size={24} />
        </button>
        <div className="relative hidden sm:block w-96">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="block w-full rounded-full border-0 py-1.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Search booking, guest or room..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-slate-500 focus:outline-none">
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
          <Bell size={24} />
        </button>
      </div>
    </header>
  );
}
