import { useCallback, useState } from 'react'
import type { TranscriptEntry } from '@/components/TranscriptConsole'

export default function useTranscript() {
  const [segments, setSegments] = useState<TranscriptEntry[]>([])

  const addSegments = useCallback(
    (
      incoming: Array<{ id: string; text: string; final: boolean }>,
      speaker: 'user' | 'agent',
    ) => {
      setSegments((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]))
        for (const seg of incoming) {
          map.set(seg.id, {
            id: seg.id,
            speaker,
            text: seg.text,
            isFinal: seg.final,
          })
        }
        return Array.from(map.values())
      })
    },
    [],
  )

  const clear = useCallback(() => setSegments([]), [])

  return { segments, addSegments, clear }
}
