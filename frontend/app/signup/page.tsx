'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    const result = await signup({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      agreeTerms: formData.agreeTerms,
    });
    setIsLoading(false);


    if (result.success) {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('wrightpay_signup_email', formData.email.trim());
        } catch {
          // Ignore sessionStorage errors
        }
      }
      router.push('/verify-email');
    } else {
      setErrors((prev) => ({
        ...prev,
        email: result.error || 'An account with this email address already exists.',
      }));
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">WrightPay</h1>
            <p className="text-slate-600 mt-2">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-900 mb-2">
                  First name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Anna"
                  className={`w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border ${
                    errors.firstName ? 'border-red-500' : 'border-slate-300'
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.firstName ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                  } focus:border-transparent`}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-900 mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Kowalski"
                  className={`w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border ${
                    errors.lastName ? 'border-red-500' : 'border-slate-300'
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.lastName ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                  } focus:border-transparent`}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border ${
                  errors.email ? 'border-red-500' : 'border-slate-300'
                } rounded-lg focus:outline-none focus:ring-2 ${
                  errors.email ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                } focus:border-transparent`}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border ${
                  errors.password ? 'border-red-500' : 'border-slate-300'
                } rounded-lg focus:outline-none focus:ring-2 ${
                  errors.password ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                } focus:border-transparent`}
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-900 mb-2">
                Confirm password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                } rounded-lg focus:outline-none focus:ring-2 ${
                  errors.confirmPassword ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                } focus:border-transparent`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="w-4 h-4 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
              />
              <span className="text-sm text-slate-600">
                I agree to the Terms of Service and Privacy Policy
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors mt-6 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-center text-slate-600 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
