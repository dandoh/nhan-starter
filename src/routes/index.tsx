import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, ArrowRight } from 'lucide-react'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Home' }]} />
      <AppPageContentWrapper className="flex items-center justify-center">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold">
            Welcome to Workspace
          </h1>
          <p className="text-xl text-muted-foreground">
            Explore our demo pages showcasing modern UI patterns
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/demo/team" className="group">
            <Card className="transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Users className="size-6" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  Team Management
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  View and manage team members with role assignments, status tracking, and team collaboration features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    Data Tables
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    Filters
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    Actions
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/demo/career" className="group">
            <Card className="transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <TrendingUp className="size-6" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  Career Progression
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Track employee onboarding and career development with organized checklists and role-based pathways.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    Checklists
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    Accordion
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    Progress
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
