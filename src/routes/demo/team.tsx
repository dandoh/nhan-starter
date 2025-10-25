import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  MoreHorizontal,
  ChevronDown,
  Download,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Star,
  Heart,
  Bell,
  Settings,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'

export const Route = createFileRoute('/demo/team')({
  component: ComponentShowcase,
})

interface TeamMember {
  id: string
  name: string
  initials: string
  avatar?: string
  role: string
  roleType: 'Tech' | 'Product' | null
  status: 'Pending' | 'Approved' | 'Rejected'
  amount: string
  teamMembers: Array<{ initials: string; avatar?: string }>
}

const teamData: TeamMember[] = [
  {
    id: '1',
    name: 'David Wilson',
    initials: 'DW',
    role: 'Founder & CEO',
    roleType: null,
    status: 'Approved',
    amount: '$200,000',
    teamMembers: [{ initials: 'BW' }, { initials: 'JH' }],
  },
  {
    id: '2',
    name: 'Jessica Hayes',
    initials: 'JH',
    role: 'Co-founder & CFO',
    roleType: null,
    status: 'Approved',
    amount: '$200,000',
    teamMembers: [{ initials: 'AS' }, { initials: 'MB' }, { initials: 'CP' }],
  },
  {
    id: '3',
    name: 'Constanza Perez',
    initials: 'CP',
    role: 'Head of Product',
    roleType: 'Product',
    status: 'Pending',
    amount: '$150,000',
    teamMembers: [{ initials: 'AS' }, { initials: 'MB' }, { initials: 'JH' }],
  },
  {
    id: '4',
    name: 'Meera Desai',
    initials: 'MD',
    role: 'Head of Engineering',
    roleType: 'Tech',
    status: 'Approved',
    amount: '$170,000',
    teamMembers: [{ initials: 'DW' }],
  },
  {
    id: '5',
    name: 'Benjamin Weber',
    initials: 'BW',
    role: 'Backend Engineer',
    roleType: 'Tech',
    status: 'Pending',
    amount: '$120,000',
    teamMembers: [{ initials: 'MD' }, { initials: 'JH' }],
  },
]

function ComponentShowcase() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set(['1', '2']))
  const [progress, setProgress] = useState(65)
  const [notifications, setNotifications] = useState(true)
  const [sliderValue, setSliderValue] = useState([50])

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const toggleAll = () => {
    if (selectedRows.size === teamData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(teamData.map((m) => m.id)))
    }
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Demo' },
          { label: 'Team Management' },
        ]}
      >
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm">
            <Download className="mr-2 size-4" />
            Export
          </Button>
        </div>
      </TopNav>
      <AppPageContentWrapper>
        <Tabs defaultValue="buttons" className="space-y-6">
          <TabsList>
            <TabsTrigger value="buttons">Buttons & Actions</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="data">Data Display</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          {/* Buttons & Actions Tab */}
          <TabsContent value="buttons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>
                  All button variants and sizes with icons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Button Variants</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Button Sizes</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Buttons with Icons</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button>
                      <Mail className="mr-2 size-4" />
                      Send Email
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 size-4" />
                      Download
                    </Button>
                    <Button variant="secondary">
                      <Plus className="mr-2 size-4" />
                      Add New
                    </Button>
                    <Button variant="destructive">
                      <XCircle className="mr-2 size-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Loading & Disabled States</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled>Disabled</Button>
                    <Button variant="outline" disabled>
                      Disabled Outline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dropdown Menus</CardTitle>
                <CardDescription>
                  Contextual menus and action lists
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Filter className="mr-2 size-4" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem checked>
                        Active
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem>
                        Inactive
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem>
                        Pending
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        Actions
                        <ChevronDown className="ml-2 size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Mail className="mr-2 size-4" />
                        Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="mr-2 size-4" />
                        Call
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <XCircle className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges</CardTitle>
                <CardDescription>Status indicators and labels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge className="bg-primary-600">Custom</Badge>
                  <Badge className="bg-chart-1">Chart 1</Badge>
                  <Badge className="bg-chart-2">Chart 2</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Inputs</CardTitle>
                <CardDescription>
                  Text inputs, selects, and other form controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search">Search with Icon</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="search" className="pl-9" placeholder="Search..." />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Select Role</Label>
                    <Select>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Textarea</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Checkboxes</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" />
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Accept terms and conditions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="marketing" defaultChecked />
                      <label
                        htmlFor="marketing"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Receive marketing emails
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Radio Group</Label>
                  <RadioGroup defaultValue="comfortable">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="r1" />
                      <Label htmlFor="r1">Default</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="comfortable" id="r2" />
                      <Label htmlFor="r2">Comfortable</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compact" id="r3" />
                      <Label htmlFor="r3">Compact</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications-switch">Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about updates
                      </p>
                    </div>
                    <Switch
                      id="notifications-switch"
                      checked={notifications}
                      onCheckedChange={setNotifications}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Slider ({sliderValue[0]}%)</Label>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Submit</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dialog Example</CardTitle>
                <CardDescription>Modal dialogs and confirmations</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Team Member</DialogTitle>
                      <DialogDescription>
                        Enter the details of the new team member below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dialog-name">Name</Label>
                        <Input id="dialog-name" placeholder="John Doe" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dialog-email">Email</Label>
                        <Input
                          id="dialog-email"
                          type="email"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dialog-role">Role</Label>
                        <Select>
                          <SelectTrigger id="dialog-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engineer">Engineer</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Add Member</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Display Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avatars</CardTitle>
                <CardDescription>User avatars with fallbacks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="size-8">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      AB
                    </AvatarFallback>
                  </Avatar>
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-chart-1 text-white">
                      CD
                    </AvatarFallback>
                  </Avatar>
                  <Avatar className="size-16">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage your team members and their roles
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="mr-2 size-4" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.size === teamData.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Compensation</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamData.map((member) => (
                      <TableRow
                        key={member.id}
                        data-state={
                          selectedRows.has(member.id) ? 'selected' : undefined
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(member.id)}
                            onCheckedChange={() => toggleRow(member.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10">
                              <AvatarFallback className="bg-primary/10 font-medium text-primary">
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="font-medium">{member.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {member.name.toLowerCase().replace(' ', '.')}@company.com
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">
                              {member.role}
                            </span>
                            {member.roleType && (
                              <Badge
                                variant="secondary"
                                className={
                                  member.roleType === 'Tech'
                                    ? 'bg-chart-1 font-medium text-white'
                                    : 'bg-chart-2 font-medium text-white'
                                }
                              >
                                {member.roleType}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.status === 'Approved'
                                ? 'default'
                                : member.status === 'Rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="font-normal"
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {member.amount}
                        </TableCell>
                        <TableCell>
                          <div className="flex -space-x-2">
                            {member.teamMembers.slice(0, 3).map((tm, idx) => (
                              <Avatar
                                key={idx}
                                className="size-8 border-2 border-background"
                              >
                                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                  {tm.initials}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {member.teamMembers.length > 3 && (
                              <div className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                                +{member.teamMembers.length - 3}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Mail className="mr-2 size-4" />
                                Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Members
                  </CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamData.length}</div>
                  <p className="text-xs text-muted-foreground">
                    +2 from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Approvals
                  </CardTitle>
                  <Clock className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {teamData.filter((m) => m.status === 'Pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Projects
                  </CardTitle>
                  <Star className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    3 completing this week
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>
                  Status messages and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="size-4" />
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    This is an informational alert with additional context.
                  </AlertDescription>
                </Alert>

                <Alert className="border-chart-1 bg-chart-1/10">
                  <CheckCircle2 className="size-4 text-chart-1" />
                  <AlertTitle className="text-chart-1">Success</AlertTitle>
                  <AlertDescription>
                    Your changes have been saved successfully.
                  </AlertDescription>
                </Alert>

                <Alert className="border-chart-3 bg-chart-3/10">
                  <AlertCircle className="size-4 text-chart-3" />
                  <AlertTitle className="text-chart-3">Warning</AlertTitle>
                  <AlertDescription>
                    Please review your settings before proceeding.
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <XCircle className="size-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    There was an error processing your request.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Indicators</CardTitle>
                <CardDescription>Loading and progress states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Upload Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Project Completion</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="bg-chart-1/20" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Team Capacity</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} className="bg-chart-3/20" />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    Increase
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    Decrease
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tooltips</CardTitle>
                <CardDescription>
                  Helpful hints and additional information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="flex flex-wrap gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline">
                          <Heart className="mr-2 size-4" />
                          Hover me
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to favorites</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Settings className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Settings</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Calendar className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View calendar</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MapPin className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Location settings</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
