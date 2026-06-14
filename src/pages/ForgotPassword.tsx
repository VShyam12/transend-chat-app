import { Link } from 'react-router-dom'

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="h-16 flex items-center px-6 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-semibold text-gray-900 dark:text-white">Transend</span>
        </Link>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Coming Soon - Password reset functionality will be available shortly
          </p>
          <Link
            to="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword