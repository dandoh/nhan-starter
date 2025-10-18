import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '../_authed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  // Access user context from the parent _authed layout route
  const { user, session } = useAuthContext()

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Protected Profile Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                User Information
              </h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd className="mt-1 text-sm text-foreground">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="mt-1 text-sm text-foreground">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    User ID
                  </dt>
                  <dd className="mt-1 text-xs text-foreground font-mono">
                    {user.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Email Verified
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {user.emailVerified ? (
                      <span className="text-green-600">✓ Verified</span>
                    ) : (
                      <span className="text-amber-600">Not verified</span>
                    )}
                  </dd>
                </div>
                {user.image && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">
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

            <div className="pt-6 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Session Information
              </h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Session ID
                  </dt>
                  <dd className="mt-1 text-xs text-foreground font-mono">
                    {session.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Expires At
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {new Date(session.expiresAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="pt-6 border-t border-border">
              <div className="rounded-md bg-accent p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-accent-foreground"
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
                    <h3 className="text-sm font-medium text-accent-foreground">
                      Protected Route
                    </h3>
                    <div className="mt-2 text-sm text-accent-foreground">
                      <p>
                        This page is automatically protected by the{' '}
                        <code className="bg-accent/50 px-1 rounded">
                          _authed.tsx
                        </code>{' '}
                        layout route. Users who are not authenticated will be
                        redirected to the login page.
                      </p>
                      <p className="mt-2">
                        The user and session data are available via{' '}
                        <code className="bg-accent/50 px-1 rounded">
                          Route.useRouteContext()
                        </code>{' '}
                        in any nested route.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
