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
  // Whether the user is pinned to the bottom (i.e. not reading scrolled-up history).
  const pinnedRef = useRef(true)

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.clientHeight - el.scrollTop < 24
  }

  // Auto-scroll to the newest line only when the user is already at the bottom,
  // so scrolling up to read earlier transcription isn't yanked back down by
  // incoming (often interim) segments. rAF ensures we scroll after reflow so the
  // last wrapped line is fully visible.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !pinnedRef.current) return
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
    return () => cancelAnimationFrame(id)
  }, [segments])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'mt-1.5 sm:mt-3 bg-[#111] border border-border rounded-lg sm:rounded-xl',
        'max-h-[100px] sm:max-h-[200px] min-h-[48px] sm:min-h-[60px] overflow-y-auto overflow-x-hidden',
        'px-3 py-2 sm:p-4 text-left text-xs sm:text-sm leading-relaxed',
      )}
    >
      {segments.length === 0 ? (
        <span className="text-neutral-600 italic">Transcript will appear here...</span>
      ) : (
        segments.map((seg) => (
          <div key={seg.id} className="mb-1 sm:mb-1.5 break-words [overflow-wrap:anywhere]">
            <span
              className={cn(
                'font-semibold mr-1 sm:mr-1.5',
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
