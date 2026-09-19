'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function CompliancePage() {
  return (
    <DashboardLayout>

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Compliance Dashboard</h1>
          <p className="text-slate-600 mt-2">Monitor compliance status and regulatory requirements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">KYC Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <span className="text-slate-900 font-medium">Verified Users</span>
                <span className="text-green-600 font-bold">7,234</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded">
                <span className="text-slate-900 font-medium">Pending Review</span>
                <span className="text-amber-600 font-bold">321</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <span className="text-slate-900 font-medium">Rejected</span>
                <span className="text-red-600 font-bold">45</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">AML Monitoring</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <span className="text-slate-900 font-medium">Clean Checks</span>
                <span className="text-green-600 font-bold">12,398</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded">
                <span className="text-slate-900 font-medium">Flagged for Review</span>
                <span className="text-amber-600 font-bold">52</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <span className="text-slate-900 font-medium">High Risk</span>
                <span className="text-red-600 font-bold">3</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">🚧 Under Development</h3>
          <p className="text-slate-600">
            Compliance dashboard features will be implemented in a future milestone. This includes detailed AML/KYC monitoring, regulatory reporting, and compliance alerts.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
