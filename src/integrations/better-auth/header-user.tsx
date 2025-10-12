import { useSession, signOut } from '@/auth/auth-client'
import { Link } from '@tanstack/react-router'

export default function HeaderUser() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="text-sm text-gray-400">Loading...</div>
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">
          {session.user.name || session.user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/demo/auth"
      className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors"
    >
      Sign In
    </Link>
  )
}

