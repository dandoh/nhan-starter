import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6">
          Welcome to{' '}
          <span className="text-primary">
            Our App
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          The modern platform for building amazing applications. Get started today and experience the difference.
        </p>
        <Button size="lg" asChild>
          <Link to="/login">
            Get Started
          </Link>
        </Button>
      </div>
    </div>
  )
}
