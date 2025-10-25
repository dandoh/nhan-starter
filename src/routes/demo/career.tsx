import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Users,
  GraduationCap,
  TrendingUp,
  Target,
  CheckCircle2,
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TopNav } from '@/components/TopNav'
import {
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'

export const Route = createFileRoute('/demo/career')({
  component: CareerPage,
})

interface ChecklistItem {
  id: string
  label: string
  isOptional?: boolean
  checked: boolean
}

interface RoleSection {
  id: string
  title: string
  count: number
  items: ChecklistItem[]
}

const features = [
  {
    icon: Users,
    title: 'Team alignment',
    description: 'Foster collaboration with transparent role-based objectives.',
  },
  {
    icon: GraduationCap,
    title: 'Skills development',
    description: 'Empower your team with tailored learning pathways.',
  },
  {
    icon: TrendingUp,
    title: 'Progress tracking',
    description: 'Monitor individual and team advancement effortlessly.',
  },
  {
    icon: Target,
    title: 'Performance insights',
    description: 'Gain actionable data to optimize team productivity.',
  },
]

function CareerPage() {
  const [roles, setRoles] = useState<RoleSection[]>([
    {
      id: 'software-dev',
      title: 'Software Developer',
      count: 6,
      items: [
        { id: 'sd-1', label: 'Office Introduction', checked: false },
        { id: 'sd-2', label: 'Introduction to Company Culture', checked: false },
        { id: 'sd-3', label: 'Product Walkthrough Session', checked: false },
        { id: 'sd-4', label: 'Skill Development Courses', isOptional: true, checked: false },
        { id: 'sd-5', label: 'Mentorship Program', isOptional: true, checked: false },
        { id: 'sd-6', label: 'Language Courses', isOptional: true, checked: false },
      ],
    },
    {
      id: 'lead-software-dev',
      title: 'Lead Software Developer',
      count: 8,
      items: [
        { id: 'lsd-1', label: 'Office Introduction', checked: false },
        { id: 'lsd-2', label: 'Introduction to Company Culture', checked: false },
        { id: 'lsd-3', label: 'Product Walkthrough Session', checked: false },
        { id: 'lsd-4', label: 'Leadership Training', checked: false },
        { id: 'lsd-5', label: 'Team Management Workshop', checked: false },
        { id: 'lsd-6', label: 'Skill Development Courses', isOptional: true, checked: false },
        { id: 'lsd-7', label: 'Mentorship Program', isOptional: true, checked: false },
        { id: 'lsd-8', label: 'Language Courses', isOptional: true, checked: false },
      ],
    },
    {
      id: 'product-owner',
      title: 'Product Owner',
      count: 5,
      items: [
        { id: 'po-1', label: 'Office Introduction', checked: false },
        { id: 'po-2', label: 'Introduction to Company Culture', checked: false },
        { id: 'po-3', label: 'Product Walkthrough Session', checked: false },
        { id: 'po-4', label: 'Skill Development Courses', isOptional: true, checked: true },
        { id: 'po-5', label: 'Mentorship Program', isOptional: true, checked: true },
        { id: 'po-6', label: 'Language Courses', isOptional: true, checked: true },
      ],
    },
  ])

  const toggleItem = (roleId: string, itemId: string) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) =>
        role.id === roleId
          ? {
              ...role,
              items: role.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : role
      )
    )
  }

  return (
    <AppPageWrapper>
      <TopNav title="Career Development" />
      <AppPageContentWrapper className="p-0">
        <div className="flex h-full">
        {/* Left Section - Hero */}
        <div className="w-full border-r border-border bg-card p-16 lg:w-1/2">
        <div className="mx-auto max-w-xl">
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Growth at every level
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-tight">
              Making yourself
              <br />
              at home
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
                  <feature.icon className="size-6" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section - Accordion */}
      <div className="w-full overflow-auto bg-muted/30 p-8 lg:w-1/2">
        <div className="mx-auto max-w-2xl">
          <Accordion type="single" collapsible defaultValue="product-owner" className="space-y-3 p-4">
            {roles.map((role) => (
              <AccordionItem
                key={role.id}
                value={role.id}
                className="rounded-lg border border-border bg-card px-6 py-2"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <GraduationCap className="size-5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{role.title}</span>
                      <span className="text-xs text-muted-foreground">{role.count}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-4">
                  {role.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md px-2 py-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={item.id}
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(role.id, item.id)}
                        />
                        <label
                          htmlFor={item.id}
                          className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {item.label}
                        </label>
                      </div>
                      {item.isOptional && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Optional
                        </Badge>
                      )}
                      {item.checked && !item.isOptional && (
                        <CheckCircle2 className="size-4 text-primary" />
                      )}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        </div>
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

