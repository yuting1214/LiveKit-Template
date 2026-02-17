import { cn } from '@/lib/utils'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface StatusBadgeProps {
  status: ConnectionStatus
  roomName?: string
}

const dotStyles: Record<ConnectionStatus, string> = {
  disconnected: 'bg-neutral-500',
  connecting: 'bg-yellow-500 animate-pulse',
  connected: 'bg-green-500',
  error: 'bg-red-500',
}

const labels: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Error',
}

export default function StatusBadge({ status, roomName }: StatusBadgeProps) {
  const label = status === 'connected' && roomName
    ? `Connected to ${roomName}`
    : labels[status]

  return (
    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm mb-4 sm:mb-8 bg-surface border border-border">
      <span className={cn('w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full', dotStyles[status])} />
      <span className="truncate max-w-[200px]">{label}</span>
    </div>
  )
}
