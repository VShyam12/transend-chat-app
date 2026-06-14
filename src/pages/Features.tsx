import { Link } from 'react-router-dom'

const Features = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="h-16 flex items-center px-6 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-semibold text-gray-900 dark:text-white">Transend</span>
        </Link>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Features</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Coming Soon - Exciting features that will transform your chat experience
          </p>
        </div>
      </div>
    </div>
  )
}

export default Features