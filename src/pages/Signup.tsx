import { Link } from 'react-router-dom'
import { GlobeAltIcon } from '@heroicons/react/24/outline'

import SignupForm from '../components/SignupForm'

const Signup = () => {


  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Section - Form */}
      <div className="flex-1 flex flex-col">
        {/* Back Button */}
        <div className="p-6">
          <Link to="/" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create Account</h1>
              <p className="mt-2 text-gray-600">Start chatting across languages</p>
            </div>

            <div className="space-y-6">
              <SignupForm />
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Welcome Message */}
      <div className="hidden lg:flex lg:flex-1 bg-gray-50 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <GlobeAltIcon className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-semibold text-blue-600">Transend</span>
          </div>

          <h2 className="text-4xl font-bold text-gray-900">Welcome to Global Communication</h2>
          <p className="mt-4 text-lg text-gray-600">
            Join a community that speaks every language. Connect with anyone, anywhere.
          </p>

          <div className="mt-12 space-y-8">
            <Feature
              icon="🌍"
              title="100+ Languages Supported"
              description="Communicate in your native language"
            />
            <Feature
              icon="⚡"
              title="Real-Time Translation"
              description="Instant message translation as you chat"
            />
            <Feature
              icon="🔒"
              title="Secure & Private"
              description="End-to-end encrypted conversations"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Feature component for the right section
const Feature = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
      <span className="text-2xl">{icon}</span>
    </div>
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
)

export default Signup