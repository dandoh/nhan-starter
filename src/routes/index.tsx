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
              Welcome to Your Starter
            </h1>
            <p className="text-xl text-muted-foreground">
              A clean foundation with auth, ORPC, TanStack Router, and shadcn UI
            </p>
          </div>
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
