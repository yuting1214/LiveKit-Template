import { useEffect, useRef } from 'react'
import { createAnalyserFromStream, getRmsLevel } from '@/lib/audio'

export default function useAudioAnalyser(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
  isMic: boolean,
) {
  const rmsRef = useRef(0)

  useEffect(() => {
    if (!stream || !audioContext || audioContext.state === 'closed') {
      rmsRef.current = 0
      return
    }

    // Ensure context is running (should already be from user gesture)
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
