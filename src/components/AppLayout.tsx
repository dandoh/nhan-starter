import { Link, useLocation } from '@tanstack/react-router'
import {
  Home,
  Settings,
  Table,
  Plug,
  BookOpen,
  Moon,
  Sun,
  Scan,
  Sparkles,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { AIChatProvider } from '@/components/ai-chat/ai-chat-context'
import { useSession } from '@/auth/auth-client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { setOptions } from 'react-scan'
import { cn } from '@/lib/utils'

const mainNavigation = [
  {
    title: 'Home',
    icon: Home,
    url: '/',
  },
  {
    title: 'Tables',
    icon: Table,
    url: '/tables',
  },
  {
    title: 'Workbooks',
    icon: BookOpen,
    url: '/workbooks',
  },
  {
    title: 'Prototype',
    icon: Sparkles,
    url: '/prototype',
  },
]

const connectorsNavigation = [
  {
    title: 'Connectors',
    icon: Plug,
    url: '/connectors',
  },
]

function SettingsMenu() {
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [reactScanShowToolbar, setReactScanShowToolbar] = useState(true) // Default to showing toolbar

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
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function SidebarHeaderContent() {
  const { data: session } = useSession()
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'

  return (
    <SidebarHeader className="h-14 justify-center items-center">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip={session?.user?.name || session?.user?.email || 'User'}
          >
            <div className={cn(!isExpanded && 'flex items-center justify-center')}>
              <Avatar className="size-6">
                <AvatarImage
                  src={session?.user?.image || undefined}
                  alt={session?.user?.name || session?.user?.email || 'User'}
                />
                <AvatarFallback>
                  {session?.user?.name?.slice(0, 2).toUpperCase() ||
                    session?.user?.email?.slice(0, 2).toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
              {isExpanded && (
                <span className="truncate font-semibold">
                  {session?.user?.name || session?.user?.email || 'User'}
                </span>
              )}
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <AIChatProvider>
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
            <SidebarGroup>
              <SidebarGroupLabel>Connectors</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {connectorsNavigation.map((item) => (
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
    </AIChatProvider>
  )
}
