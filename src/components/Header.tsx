import { Link } from '@tanstack/react-router'
import { useSession, signOut } from '@/auth/auth-client'
import { Button } from '@/components/ui/button'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="text-xl font-semibold hover:text-primary transition-colors"
            >
              My App
            </Link>
            
            {session?.user && (
              <nav className="flex items-center gap-4">
                <Link
                  to="/tables"
                  className="px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  activeProps={{
                    className: 'px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                  }}
                >
                  Tables
                </Link>
                <Link
                  to="/app"
                  className="px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  activeProps={{
                    className: 'px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                  }}
                >
                  App
                </Link>
                <Link
                  to="/profile"
                  className="px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  activeProps={{
                    className: 'px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                  }}
                >
                  Profile
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {session.user.name || session.user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
