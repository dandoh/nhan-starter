import { Github, type LucideIcon } from 'lucide-react'
import React from 'react'

// Linear icon - custom SVG based on Linear's logo
const LinearIcon: React.FC<{ className?: string }> = ({ className }) => {
  return React.createElement(
    'svg',
    {
      className,
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    React.createElement('path', {
      d: 'M12 2L2 7L12 12L22 7L12 2Z',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none',
    }),
    React.createElement('path', {
      d: 'M2 17L12 22L22 17',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none',
    }),
    React.createElement('path', {
      d: 'M2 12L12 17L22 12',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fill: 'none',
    }),
  )
}

export type Connector = {
  name: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  authConfigId: string
}

export const connectors: Connector[] = [
  {
    name: 'GitHub',
    icon: Github,
    authConfigId: 'ac_IuEq5WN-oMRd',
  },
  {
    name: 'Linear',
    icon: LinearIcon,
    authConfigId: 'ac_yAxHf7Gi36Xm',
  },
]

