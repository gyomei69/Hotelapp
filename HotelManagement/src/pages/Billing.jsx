import React from 'react';
import { Download, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const billingData = [
  { id: 'INV-2023-001', guest: 'Eleanor Pena', date: 'Oct 15, 2023', amount: '$450.00', method: 'Credit Card', type: 'Income', status: 'Paid' },
  { id: 'INV-2023-002', guest: 'Supplier Co', date: 'Oct 14, 2023', amount: '$1,200.00', method: 'Bank Transfer', type: 'Expense', status: 'Paid' },
  { id: 'INV-2023-003', guest: 'Albert Flores', date: 'Oct 12, 2023', amount: '$1,200.00', method: 'Credit Card', type: 'Income', status: 'Pending' },
  { id: 'INV-2023-004', guest: 'Maintenance Svc', date: 'Oct 10, 2023', amount: '$350.00', method: 'Cash', type: 'Expense', status: 'Paid' },
];

export default function Billing() {
  return (
    <div className="p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Billing & Payments</h2>
          <p className="text-sm text-slate-500 mt-1">View all transactions, invoices, and expenses.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
          <Download size={18} />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Revenue', value: '$124,500.00', trend: '+14%', isPos: true },
          { label: 'Pending Payments', value: '$8,240.00', trend: '-2%', isPos: false },
          { label: 'Total Expenses', value: '$34,100.00', trend: '+5%', isPos: false },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between">
            <p className="text-sm font-medium text-slate-500 mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
            <button className="text-sm font-semibold text-indigo-600">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 pl-6 font-semibold">Invoice ID</th>
                <th className="px-6 py-4 font-semibold">Guest / Details</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingData.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-600">{tx.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                        {tx.type === 'Income' ? <ArrowDownRight size={16} className="text-emerald-500"/> : <ArrowUpRight size={16} className="text-rose-500"/>}
                        {tx.guest}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 pl-6">{tx.type}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{tx.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{tx.amount}</td>
                  <td className="px-6 py-4 text-slate-600">{tx.method}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                      <FileText size={18} />
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
