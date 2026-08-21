'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function OperationsPage() {
  return (
    <DashboardLayout>

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Operations Dashboard</h1>
          <p className="text-slate-600 mt-2">Monitor platform operations and activities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Transactions', value: '12,450', trend: '+5.2%' },
            { label: 'Transaction Volume', value: '€2.5M', trend: '+12.1%' },
            { label: 'Active Users', value: '8,234', trend: '+2.8%' },
            { label: 'System Uptime', value: '99.98%', trend: 'Stable' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-slate-600 text-sm font-medium mb-2">{stat.label}</p>
              <h2 className="text-2xl font-bold text-slate-900">{stat.value}</h2>
              <p className="text-sm text-green-600 mt-2">{stat.trend}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">🚧 Under Development</h3>
          <p className="text-slate-600">
            Operations dashboard features will be implemented in a future milestone. This includes monitoring transaction flows, system performance, and operational metrics.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
