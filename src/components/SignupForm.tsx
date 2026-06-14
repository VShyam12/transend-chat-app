import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { LANGUAGES } from '../data/languages'
import api from '../utils/api'
import { setStoredAuth } from '../store/authStore'

export default function SignupForm(): JSX.Element {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferredLanguage, setPreferredLanguage] = useState('en')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      alert('Please fill name, email and password')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name,
        email,
        password,
        preferredLanguage,
      }

      const res = await api.post('/api/auth/register', payload, {
        headers: { 'Content-Type': 'application/json' },
      })

      console.log('Signup success:', res.data)
      setStoredAuth(res.data)
      alert('Signup successful')
      navigate('/chat')
    } catch (err: any) {
      console.error('Signup error:', err?.response || err.message || err)
      const msg = err?.response?.data?.message || err?.response?.data || err.message || 'Signup failed'
      alert(`Signup failed: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your name"
            className="mt-1 block w-full rounded-xl bg-gray-50 px-5 py-3 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 border border-transparent focus:border-blue-200"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            className="mt-1 block w-full rounded-xl bg-gray-50 px-5 py-3 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 border border-transparent focus:border-blue-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="mt-1 block w-full rounded-xl bg-gray-50 px-5 py-3 placeholder-gray-400 focus:ring-2 focus:ring-blue-300 border border-transparent focus:border-blue-200"
          />
        </div>

        <div>
          <label htmlFor="preferredLanguage" className="block text-sm font-medium text-gray-700">
            Preferred Language
          </label>
          <div className="relative mt-1">
            <select
              id="preferredLanguage"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="block w-full rounded-xl bg-gray-50 px-5 py-3 appearance-none"
            >
              {LANGUAGES
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
            </select>
            <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          <p className="mt-2 text-sm text-gray-500">Messages will be translated to this language</p>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-60 shadow-md"
          >
            {isSubmitting ? 'Signing up...' : 'Create Account'}
          </button>
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
