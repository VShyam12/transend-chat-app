import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import api from '../utils/api'
import { setStoredAuth } from '../store/authStore'

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/auth/login', { email, password }, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (res && res.status === 200) {
        setStoredAuth(res.data)
        navigate('/chat')
      } else {
        setError('Incorrect email or password')
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 400 || status === 401) {
        setError('Incorrect email or password')
      } else {
        setError('An error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="p-6">
          <a href="/" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="w-10 h-10 text-blue-600" />
              <span className="text-2xl font-semibold text-gray-900">Transend</span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
              <p className="mt-2 text-gray-600">Welcome back — sign in to continue chatting</p>
            </div>

            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-xl bg-gray-50 px-5 py-3 placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-transparent"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-xl bg-gray-50 px-5 py-3 placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-transparent"
                  />
                </div>

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-60 shadow-md"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>

            <p className="text-center text-sm text-gray-600">
              Don't have an account? <a href="/signup" className="text-blue-600 font-medium">Create account</a>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 bg-gray-50 items-center justify-center p-12">
        <div className="max-w-md">
          <h2 className="text-4xl font-bold text-gray-900">Welcome to Global Communication</h2>
          <p className="mt-4 text-lg text-gray-600">Join a community that speaks every language. Connect with anyone, anywhere.</p>

          <div className="mt-12 space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                🌍
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">100+ Languages Supported</h3>
                <p className="text-gray-600">Communicate in your native language</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">⚡</div>
              <div>
                <h3 className="font-semibold text-gray-900">Real-Time Translation</h3>
                <p className="text-gray-600">Instant message translation as you chat</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure & Private</h3>
                <p className="text-gray-600">End-to-end encrypted conversations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login