import { useSession, signOut } from '@/auth/auth-client'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export default function HeaderUser() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {session.user.name || session.user.email}
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => signOut()}
        >
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" asChild>
      <Link to="/login">
        Sign In
      </Link>
    </Button>
  )
}

