'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function AdminPage() {
  return (
    <DashboardLayout>

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">Platform administration and management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Total Users', value: '15,234', color: 'blue' },
            { label: 'Platform Revenue', value: '€450K', color: 'green' },
            { label: 'Support Tickets', value: '23', color: 'amber' },
            { label: 'System Alerts', value: '2', color: 'red' },
            { label: 'Server Status', value: 'Healthy', color: 'green' },
            { label: 'API Health', value: '100%', color: 'green' },
          ].map((stat, i) => {
            const colorMap = {
              blue: 'bg-blue-50 border-blue-200',
              green: 'bg-green-50 border-green-200',
              amber: 'bg-amber-50 border-amber-200',
              red: 'bg-red-50 border-red-200',
            };
            return (
              <div
                key={i}
                className={`rounded-lg shadow-sm p-6 border ${colorMap[stat.color as keyof typeof colorMap]}`}
              >
                <p className="text-slate-600 text-sm font-medium mb-2">{stat.label}</p>
                <h2 className="text-2xl font-bold text-slate-900">{stat.value}</h2>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                → User Management
              </button>
              <button className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                → System Configuration
              </button>
              <button className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                → View Audit Logs
              </button>
              <button className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                → Database Management
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activities</h3>
            <div className="space-y-3 text-sm">
              <div className="py-2 border-b border-slate-200">
                <p className="text-slate-900">User 5234 verified</p>
                <p className="text-slate-600 text-xs">2 minutes ago</p>
              </div>
              <div className="py-2 border-b border-slate-200">
                <p className="text-slate-900">Transaction flagged for review</p>
                <p className="text-slate-600 text-xs">15 minutes ago</p>
              </div>
              <div className="py-2 border-b border-slate-200">
                <p className="text-slate-900">Support ticket resolved</p>
                <p className="text-slate-600 text-xs">1 hour ago</p>
              </div>
              <div className="py-2">
                <p className="text-slate-900">System backup completed</p>
                <p className="text-slate-600 text-xs">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">🚧 Under Development</h3>
          <p className="text-slate-600">
            Admin dashboard features will be implemented in a future milestone. This includes user management, system configuration, audit logging, and platform administration tools.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
