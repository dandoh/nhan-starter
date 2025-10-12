import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  // Access user context from the parent _authed layout route
  const { user, session } = Route.useRouteContext()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Protected Profile Page
            </h1>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  User Information
                </h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">User ID</dt>
                    <dd className="mt-1 text-xs text-gray-900 font-mono">
                      {user.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Email Verified
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.emailVerified ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span className="text-amber-600">Not verified</span>
                      )}
                    </dd>
                  </div>
                  {user.image && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Profile Image
                      </dt>
                      <dd className="mt-1">
                        <img
                          src={user.image}
                          alt={user.name}
                          className="h-20 w-20 rounded-full"
                        />
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Session Information
                </h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Session ID
                    </dt>
                    <dd className="mt-1 text-xs text-gray-900 font-mono">
                      {session.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Expires At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(session.expiresAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-blue-800">
                        Protected Route
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          This page is automatically protected by the{' '}
                          <code className="bg-blue-100 px-1 rounded">
                            _authed.tsx
                          </code>{' '}
                          layout route. Users who are not authenticated will be
                          redirected to the login page.
                        </p>
                        <p className="mt-2">
                          The user and session data are available via{' '}
                          <code className="bg-blue-100 px-1 rounded">
                            Route.useRouteContext()
                          </code>{' '}
                          in any nested route.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

