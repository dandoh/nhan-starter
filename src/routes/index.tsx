import { createFileRoute } from '@tanstack/react-router'
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
      </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
