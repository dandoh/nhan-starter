import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { Home, Settings, Moon, Sun, Scan, LogOut } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
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
                    {user.email}
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <SidebarProvider>
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
      <SidebarInset className="flex flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
