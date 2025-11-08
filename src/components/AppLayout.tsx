import { Link, useLocation } from '@tanstack/react-router'
import {
  Home,
  Users,
  TrendingUp,
  Settings,
  LayoutDashboard,
  Table,
  UserCircle,
  Plug,
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
import { AIChatProvider } from '@/components/ai-chat/ai-chat-context'
import { useSession } from '@/auth/auth-client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

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
]

const connectorsNavigation = [
  {
    title: 'Connectors',
    icon: Plug,
    url: '/connectors',
  },
  {
    title: 'Profile',
    icon: UserCircle,
    url: '/profile',
  },
  {
    title: 'Team',
    icon: Users,
    url: '/demo/team',
  },
  {
    title: 'Career',
    icon: TrendingUp,
    url: '/demo/career',
  },
]

const bottomNavigation = [
  {
    title: 'Settings',
    icon: Settings,
    url: '/settings',
  },
]

function SidebarHeaderContent() {
  const { data: session } = useSession()
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'

  return (
    <SidebarHeader className="h-14 justify-center items-center">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild tooltip={session?.user?.name || session?.user?.email || 'User'}>
            <Link to="/profile">
              <Avatar className="size-6">
                <AvatarImage src={session?.user?.image} alt={session?.user?.name || session?.user?.email || 'User'} />
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
            </Link>
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
              {bottomNavigation.map((item) => (
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
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col overflow-hidden">{children}</SidebarInset>
      </SidebarProvider>
    </AIChatProvider>
  )
}
