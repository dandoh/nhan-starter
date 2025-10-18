import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StarIcon } from 'lucide-react'

const ButtonGradient = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button
    className={cn(
      'bg-gradient-to-r from-primary-400 to-primary-600 text-primary-foreground shadow-sm hover:from-primary-500 hover:to-primary-700',
      className,
    )}
    {...props}
  />
)

const GradientButtonDemo = () => (
  <div className="flex items-center gap-2 flex-wrap">
    <ButtonGradient>Gradient</ButtonGradient>
    <ButtonGradient size="icon">
      <StarIcon />
    </ButtonGradient>
    <ButtonGradient>
      <StarIcon /> Star
    </ButtonGradient>
  </div>
)

export default GradientButtonDemo
