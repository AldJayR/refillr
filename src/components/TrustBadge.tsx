import { Shield, ShieldCheck, BadgeDollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'verification' | 'fair-price'

interface TrustBadgeProps {
  isVerified: boolean
  className?: string
  showLabel?: boolean
  variant?: BadgeVariant
}

export default function TrustBadge({
  isVerified,
  className,
  showLabel = false,
  variant = 'verification',
}: TrustBadgeProps) {
  if (variant === 'fair-price') {
    return (
      <div
        className={cn(
          'flex items-center gap-1',
          isVerified ? 'text-green-500' : 'text-slate-500',
          className
        )}
      >
        <BadgeDollarSign size={16} />
        {showLabel && (
          <span className="text-xs font-medium">
            {isVerified ? 'Fair Price' : 'No Price Data'}
          </span>
        )}
      </div>
    )
  }

  if (!isVerified) {
    return (
      <div className={cn('flex items-center gap-1 text-amber-500', className)}>
        <Shield size={16} />
        {showLabel && <span className="text-xs font-medium">Unverified</span>}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1 text-green-500', className)}>
      <ShieldCheck size={16} />
      {showLabel && <span className="text-xs font-medium">DOE Verified</span>}
    </div>
  )
}
