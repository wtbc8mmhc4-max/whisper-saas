"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SUBSCRIPTION_PLANS } from '@/utils/constants';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">WhisperSaaS</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/api/auth/signout"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign out
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link 
                    href="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">AI-Powered</span>
            <span className="block text-blue-600">Speech Recognition</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Transform your audio into accurate text with advanced AI models. Fast, secure, and reliable transcription for professionals.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                {session ? "Go to Dashboard" : "Start Free Trial"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need for transcription
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🎵
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Multiple Audio Sources</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Upload files, record directly, or transcribe from URLs. Support for all major audio formats.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🌍
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Multi-language Support</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Transcribe in 100+ languages with high accuracy using advanced AI models.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  ⚡
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Real-time Processing</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Get transcriptions as you speak with live processing and instant results.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  📊
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Export Options</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Export in multiple formats: TXT, SRT, VTT, and JSON for any workflow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Choose the plan that fits your needs
            </p>
          </div>
          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
              <div key={plan.id} className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
                <div className="p-6">
                  <h2 className="text-xl leading-6 font-medium text-gray-900">{plan.name}</h2>
                  <p className="mt-4 text-sm text-gray-500">
                    {plan.monthlyMinutes === -1 ? 'Unlimited' : `${plan.monthlyMinutes} minutes`} per month
                  </p>
                  <p className="mt-8">
                    <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="text-base font-medium text-gray-500">/month</span>
                  </p>
                  <Link
                    href={session ? "/dashboard" : "/login"}
                    className="mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700"
                  >
                    {plan.id === 'free' ? 'Start Free' : 'Upgrade'}
                  </Link>
                </div>
                <div className="pt-6 pb-8 px-6">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">What&apos;s included</h3>
                  <ul className="mt-6 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex space-x-3">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 WhisperSaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
