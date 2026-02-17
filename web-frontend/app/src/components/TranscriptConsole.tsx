import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface TranscriptEntry {
  id: string
  speaker: 'user' | 'agent'
  text: string
  isFinal: boolean
}

interface TranscriptConsoleProps {
  segments: TranscriptEntry[]
}

export default function TranscriptConsole({ segments }: TranscriptConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [segments])

  return (
    <div
      ref={containerRef}
      className={cn(
        'mt-8 bg-[#111] border border-border rounded-xl',
        'max-h-[260px] min-h-[80px] overflow-y-auto',
        'p-4 text-left text-sm leading-relaxed',
      )}
    >
      {segments.length === 0 ? (
        <span className="text-neutral-600 italic">Transcript will appear here...</span>
      ) : (
        segments.map((seg) => (
          <div key={seg.id} className="mb-1.5">
            <span
              className={cn(
                'font-semibold mr-1.5',
                seg.speaker === 'user' ? 'text-user' : 'text-agent',
              )}
            >
              {seg.speaker === 'user' ? 'You:' : 'Agent:'}
            </span>
            <span className={cn(!seg.isFinal && 'text-neutral-500 italic')}>
              {seg.text}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
