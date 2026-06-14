import { Link } from 'react-router-dom'
import { GlobeAltIcon } from '@heroicons/react/24/outline'

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <GlobeAltIcon className="w-8 h-8 text-primary" />
          <span className="text-xl font-semibold text-gray-900">Transend</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/features" className="text-gray-600 hover:text-gray-900">Features</Link>
          <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
          <Link to="/about" className="text-gray-600 hover:text-gray-900">About</Link>
          <Link to="/login" className="text-gray-900 hover:text-primary">Login</Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-center justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full mb-6">
              <span className="text-sm text-primary">✨ Powered by AI Translation</span>
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Chat Beyond
              <br />
              Language Barriers
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect, chat, and collaborate — no matter the language.
              Experience seamless communication with real-time
              translation for every conversation.
            </p>
            <div className="flex items-center space-x-4">
              <Link
                to="/signup"
                className="px-6 py-3 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-8 mt-16">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🌍</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">100+ Languages Supported</h3>
                  <p className="text-gray-600 mt-1">Communicate in your native language</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Real-Time Translation</h3>
                  <p className="text-gray-600 mt-1">Instant message translation as you chat</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔒</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure & Private</h3>
                  <p className="text-gray-600 mt-1">End-to-end encrypted conversations</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Landing