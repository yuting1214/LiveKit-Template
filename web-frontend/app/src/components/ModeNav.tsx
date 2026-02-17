import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ModeNavProps {
  activeMode: 'pipeline' | 'realtime'
}

export default function ModeNav({ activeMode }: ModeNavProps) {
  const modes = [
    { key: 'pipeline' as const, label: 'Pipeline', href: '/pipeline' },
    { key: 'realtime' as const, label: 'Realtime', href: '/realtime' },
  ]

  return (
    <nav className="flex justify-center gap-2 mb-6">
      {modes.map((m) => (
        <Link
          key={m.key}
          to={m.href}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm no-underline border transition-all',
            m.key === activeMode
              ? 'text-white bg-blue-500 border-blue-500'
              : 'text-muted bg-surface border-border hover:text-foreground hover:border-neutral-500',
          )}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  )
}
