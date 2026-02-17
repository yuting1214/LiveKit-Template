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
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8 bg-surface border border-border">
      <span className={cn('w-2 h-2 rounded-full', dotStyles[status])} />
      <span>{label}</span>
    </div>
  )
}
