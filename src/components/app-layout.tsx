import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { Home, Settings, Moon, Sun, Scan, LogOut, LayoutDashboard, ChevronRight, TrendingUp, PieChart, Folder } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SymbolSearchCommand } from '@/components/symbol-search-command'
import { orpcQuery } from '@/orpc/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession, signOut } from '@/auth/auth-client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { setOptions } from 'react-scan'

const mainNavigation = [
  {
    title: 'Home',
    icon: Home,
    url: '/',
  },
]

const builtInDashboards = [
  {
    title: 'Macros',
    icon: TrendingUp,
    url: '/dashboard/macros',
  },
  {
    title: 'Sectors',
    icon: PieChart,
    url: '/dashboard/sectors',
  },
]

function SettingsMenu() {
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [reactScanShowToolbar, setReactScanShowToolbar] = useState(true) // Default to showing toolbar
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Check initial theme from localStorage or HTML class
    const theme = localStorage.getItem('theme')
    const html = document.documentElement
    const hasDark = theme ? theme === 'dark' : html.classList.contains('dark')
    setIsDark(hasDark)

    // Check react-scan toolbar visibility preference
    // Default to showing toolbar if not set (backward compatibility with root component)
    const showToolbar =
      localStorage.getItem('react-scan-show-toolbar') !== 'false'
    setReactScanShowToolbar(showToolbar)
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    const newIsDark = !isDark

    if (newIsDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }

    setIsDark(newIsDark)
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  const toggleReactScan = () => {
    const newShowToolbar = !reactScanShowToolbar
    setReactScanShowToolbar(newShowToolbar)
    localStorage.setItem('react-scan-show-toolbar', newShowToolbar.toString())

    // Dynamically toggle react-scan toolbar visibility without page reload
    if (import.meta.env.DEV) {
      setOptions({ showToolbar: newShowToolbar })
      toast.success(`React Scan toolbar ${newShowToolbar ? 'shown' : 'hidden'}`)
    }
  }

  if (!mounted) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Settings">
          <Settings />
          {isExpanded && <span>Settings</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="Settings">
            <Settings />
            {isExpanded && <span>Settings</span>}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              toggleTheme()
            }}
          >
            {isDark ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>Toggle Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>Toggle Dark Mode</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              toggleReactScan()
            }}
          >
            <Scan className="mr-2 h-4 w-4" />
            <span>Toggle React Scan</span>
            {reactScanShowToolbar && (
              <span className="ml-auto text-xs text-muted-foreground">On</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              toast.info('Settings page coming soon')
              // navigate({ to: '/settings' })
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Go to Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={async () => {
              try {
                await signOut()
                toast.success('Logged out successfully')
                router.invalidate()
                // Navigate to login page
                router.navigate({ to: '/login' })
              } catch (error) {
                toast.error('Failed to log out')
                console.error('Logout error:', error)
              }
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function SidebarHeaderContent() {
  const { data: session } = useSession()
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'
  const user = session?.user
  const displayName = user?.name || user?.email || 'User'
  const initials =
    user?.name?.slice(0, 2).toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    'U'

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip={!isExpanded ? displayName : undefined}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.image || undefined} alt={displayName} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            {isExpanded && (
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                {user?.email && user.email !== user?.name && (
                  <span className="truncate text-xs text-muted-foreground">
                    abc@gmail.com
                  </span>
                )}
              </div>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

// User Dashboards Section
function UserDashboardsSection() {
  const location = useLocation()
  const { data, isLoading } = useQuery({
    ...orpcQuery.dashboard.list.queryOptions({ input: {} }),
    queryKey: ['dashboard', 'list'],
  })

  const dashboards = data?.items || []

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-6 w-full mx-2" />
        <Skeleton className="h-6 w-full mx-2" />
      </>
    )
  }

  if (dashboards.length === 0) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={location.pathname === '/dashboard'}>
          <Link to="/dashboard">
            <span className="text-muted-foreground text-xs">No dashboards yet</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <>
      {dashboards.map((dashboard) => {
        const url = `/dashboard/d/${dashboard.id}`
        return (
          <SidebarMenuSubItem key={dashboard.id}>
            <SidebarMenuSubButton asChild isActive={location.pathname === url}>
              <Link to="/dashboard/d/$id" params={{ id: dashboard.id }}>
                <Folder className="size-4" />
                <span className="truncate">{dashboard.name}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
      {/* Link to see all / manage dashboards */}
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={location.pathname === '/dashboard'}>
          <Link to="/dashboard">
            <span className="text-muted-foreground text-xs">Manage all...</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    </>
  )
}

// App layout with sidebar for authenticated routes
export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isDashboardActive = location.pathname.startsWith('/dashboard')

  return (
    <SidebarProvider>
      <SymbolSearchCommand />
      <Sidebar collapsible="icon">
        <SidebarHeaderContent />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavigation.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* Dashboard with sub-items */}
                <Collapsible
                  asChild
                  defaultOpen={isDashboardActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Built-in Dashboards */}
                        <div className="px-2 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Built-in
                          </span>
                        </div>
                        {builtInDashboards.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === item.url}
                            >
                              <Link to={item.url}>
                                <item.icon className="size-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}

                        {/* Custom Dashboards */}
                        <div className="px-2 py-1.5 mt-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Custom
                          </span>
                        </div>
                        <UserDashboardsSection />
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border">
          <SidebarMenu>
            <SettingsMenu />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-1 flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
