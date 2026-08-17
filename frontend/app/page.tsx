'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-slate-900">WrightPay</div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Cross-border payments made simple
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Send and receive money across Europe with transparent fees, real exchange rates, and fast settlement times.
          </p>
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-lg"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border-2 border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 font-medium transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Why choose WrightPay
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Fast',
                description: 'Transfers settle within 1-2 business days to most countries',
                icon: '⚡',
              },
              {
                title: 'Transparent',
                description: 'No hidden fees. You see exactly what you pay upfront.',
                icon: '👁️',
              },
              {
                title: 'Secure',
                description: 'Bank-level encryption and AML/KYC verification.',
                icon: '🔒',
              },
              {
                title: 'Multi-currency',
                description: 'Hold and transfer in 6 different currencies.',
                icon: '💱',
              },
              {
                title: 'Real rates',
                description: 'Always get the mid-market exchange rate.',
                icon: '📊',
              },
              {
                title: 'Easy to use',
                description: 'Simple interface for customers of all levels.',
                icon: '✨',
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Start sending money today</h2>
          <p className="text-slate-300 mb-8">Join thousands of customers already using WrightPay</p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">Features</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Pricing</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">About</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Blog</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">Terms</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Privacy</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Compliance</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-slate-900">Help Center</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Contact</Link></li>
                <li><Link href="#" className="hover:text-slate-900">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex items-center justify-between">
            <p className="text-sm text-slate-600">© 2024 WrightPay. All rights reserved.</p>
            <p className="text-xs text-slate-500">This is a fictional portfolio project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
