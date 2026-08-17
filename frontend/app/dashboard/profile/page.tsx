'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { mockUser } from '@/lib/mock-data';

export default function ProfilePage() {
  return (
    <DashboardLayout user={mockUser}>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-600 mt-2">Manage your account information</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {mockUser.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{mockUser.name}</h2>
              <p className="text-slate-600">{mockUser.email}</p>
            </div>
          </div>

          <button className="bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded hover:bg-slate-200 transition-colors">
            Upload Photo
          </button>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">First Name</label>
              <input
                type="text"
                defaultValue="Anna"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Last Name</label>
              <input
                type="text"
                defaultValue="Kowalski"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
              <input
                type="email"
                defaultValue={mockUser.email}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Default Currency</label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>{mockUser.defaultCurrency}</option>
                <option>GBP</option>
                <option>USD</option>
              </select>
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Password</p>
                <p className="text-sm text-slate-600">Last changed 6 months ago</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">Change</button>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                <p className="text-sm text-slate-600">Status: Not enabled</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">Enable</button>
            </div>
          </div>
        </div>

        {/* KYC Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Verification Status</h3>
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900">KYC Verification</p>
                <p className="text-sm text-slate-600">Your account is verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Account</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 rounded transition-colors">
              Download Account Data
            </button>
            <button className="w-full text-left px-4 py-3 text-red-700 hover:bg-red-50 rounded transition-colors">
              Deactivate Account
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
