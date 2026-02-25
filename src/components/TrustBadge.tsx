import { Shield, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrustBadgeProps {
  isVerified: boolean
  className?: string
  showLabel?: boolean
}

export default function TrustBadge({ 
  isVerified, 
  className,
  showLabel = false 
}: TrustBadgeProps) {
  if (!isVerified) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 text-amber-500",
          className
        )}
      >
        <Shield size={16} />
        {showLabel && (
          <span className="text-xs font-medium">Unverified</span>
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-1 text-green-500",
        className
      )}
    >
      <ShieldCheck size={16} />
      {showLabel && (
        <span className="text-xs font-medium">DOE Verified</span>
      )}
    </div>
  )
}
