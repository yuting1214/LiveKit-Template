import { useEffect, useRef } from 'react'
import { createAnalyserFromStream, getRmsLevel } from '@/lib/audio'

interface AnalyserResult {
  rmsRef: React.RefObject<number>
}

/**
 * Analyses a single MediaStream and exposes a live RMS ref.
 * Uses a shared AudioContext (must be created during user gesture).
 */
export default function useAudioAnalyser(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
  isMic: boolean,
): AnalyserResult {
  const rmsRef = useRef(0)

  useEffect(() => {
    if (!stream || !audioContext || audioContext.state === 'closed') {
      rmsRef.current = 0
      return
    }

    audioContext.resume()

    let frameId: number
    let source: MediaStreamAudioSourceNode | null = null
    let gain: GainNode | null = null

    try {
      const setup = createAnalyserFromStream(audioContext, stream, isMic)
      source = setup.source
      gain = setup.gain ?? null
      const { analyser } = setup
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      function tick() {
        rmsRef.current = getRmsLevel(analyser, dataArray)
        frameId = requestAnimationFrame(tick)
      }
      frameId = requestAnimationFrame(tick)

      return () => {
        cancelAnimationFrame(frameId)
        source?.disconnect()
        gain?.disconnect()
        rmsRef.current = 0
      }
    } catch (err) {
      console.warn('useAudioAnalyser: failed to set up analyser', err)
      return
    }
  }, [audioContext, stream, isMic])

  return { rmsRef }
}
