import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/dashboard/')({
  component: () => <Navigate to="/dashboard/macros" />,
})
