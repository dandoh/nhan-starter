import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/app')({
  component: AppPage,
})

function AppPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-foreground">Hello World</h1>
      </div>
    </div>
  )
}

