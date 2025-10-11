import {
  SignedIn,
  SignInButton,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/clerk-react'

export default function HeaderUser() {
  const { user } = useUser()

  return (
    <>
      <SignedIn>
        {user?.firstName}
        {user?.lastName}
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
    </>
  )
}
