import { useCallback, useEffect, useRef, useState } from 'react'
import ModeNav from '@/components/ModeNav'
import StatusBadge from '@/components/StatusBadge'
import AuraVisualizer from '@/components/AuraVisualizer'
import type { AuraMode } from '@/components/AuraVisualizer'
import TranscriptConsole from '@/components/TranscriptConsole'
import AgentStatus from '@/components/AgentStatus'
import ConnectButton from '@/components/ConnectButton'
import useLiveKitSession from '@/hooks/useLiveKitSession'
import useAudioAnalyser from '@/hooks/useAudioAnalyser'

interface VoiceAgentPageProps {
  mode: 'pipeline' | 'realtime'
}

const titles: Record<string, string> = {
  pipeline: 'Pipeline Voice Agent',
  realtime: 'Realtime Voice Agent',
}

const subtitles: Record<string, string> = {
  pipeline: 'OpenAI STT \u2192 GPT-4o-mini \u2192 TTS',
  realtime: 'OpenAI Realtime API (speech-to-speech)',
}

const SPEAKING_THRESHOLD = 0.02

/** Show live audio/state debug overlay — only in dev builds */
const DEBUG_MONITOR = import.meta.env.DEV

export default function VoiceAgentPage({ mode }: VoiceAgentPageProps) {
  const {
    status,
    agentStatusText,
    roomName,
    localMicStream,
    agentAudioStream,
    audioContext,
    segments,
    connect,
    disconnect,
  } = useLiveKitSession()

  // Analyse BOTH streams independently
  const { rmsRef: micRmsRef } = useAudioAnalyser(audioContext, localMicStream, true)
  const { rmsRef: agentRmsRef } = useAudioAnalyser(audioContext, agentAudioStream, false)

  // Combined RMS ref that the visualizer reads — picks the dominant stream
  const combinedRmsRef = useRef(0)

  // Derive aura mode from actual audio levels, not just track subscription state
  const [auraMode, setAuraMode] = useState<AuraMode>('disconnected')

  // Debug monitor state — only updated in dev builds
  const debugRef = useRef<HTMLDivElement>(null)
  const updateDebug = useCallback((mic: number, agent: number, mode: AuraMode) => {
    if (!DEBUG_MONITOR || !debugRef.current) return
    debugRef.current.textContent =
      `mic: ${mic.toFixed(3)} | agent: ${agent.toFixed(3)} | mode: ${mode}` +
      ` | ctx: ${audioContext ? 'running' : 'none'}` +
      ` | micStream: ${localMicStream ? 'yes' : 'no'}` +
      ` | agentStream: ${agentAudioStream ? 'yes' : 'no'}`
  }, [audioContext, localMicStream, agentAudioStream])

  useEffect(() => {
    if (status !== 'connected') {
      setAuraMode('disconnected')
      combinedRmsRef.current = 0
      if (DEBUG_MONITOR && debugRef.current) {
        debugRef.current.textContent = 'mic: 0.000 | agent: 0.000 | mode: disconnected | ctx: none | micStream: no | agentStream: no'
      }
      return
    }

    let frameId: number

    function update() {
      const micRms = micRmsRef.current ?? 0
      const agentRms = agentRmsRef.current ?? 0

      let mode: AuraMode
      let rms: number

      if (agentRms > SPEAKING_THRESHOLD && agentRms >= micRms) {
        mode = 'agent-speaking'
        rms = agentRms
      } else if (micRms > SPEAKING_THRESHOLD) {
        mode = 'user-speaking'
        rms = micRms
      } else {
        mode = 'idle'
        rms = Math.max(micRms, agentRms)
      }

      combinedRmsRef.current = rms
      setAuraMode(mode)
      updateDebug(micRms, agentRms, mode)

      frameId = requestAnimationFrame(update)
    }
    frameId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [status, micRmsRef, agentRmsRef, updateDebug])

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a1014] overflow-hidden">
      {/* Debug monitor — dev builds only */}
      {DEBUG_MONITOR && (
        <div
          ref={debugRef}
          className="fixed top-0 left-0 right-0 z-50 bg-black/80 text-[10px] font-mono text-green-400 px-2 py-1 text-center"
        />
      )}
      {/* Header — compact on mobile */}
      <div className="shrink-0 pt-safe">
        <div className="pt-3 sm:pt-6 pb-1 sm:pb-2 text-center px-4">
          <h1 className="text-base sm:text-xl font-semibold text-white mb-0.5 sm:mb-1">{titles[mode]}</h1>
          <p className="hidden sm:block text-xs text-neutral-500 mb-4">{subtitles[mode]}</p>
          <p className="sm:hidden text-[10px] text-neutral-500 mb-2">{subtitles[mode]}</p>
          <ModeNav activeMode={mode} />
          <div className="mt-2 sm:mt-3">
            <StatusBadge status={status} roomName={roomName} />
          </div>
        </div>
      </div>

      {/* Aura — fills remaining space */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-4">
        <AuraVisualizer auraMode={auraMode} rmsRef={combinedRmsRef} />
      </div>

      {/* Bottom controls — anchored to bottom with safe area */}
      <div className="shrink-0 pb-2 sm:pb-6 px-3 sm:px-4 text-center pb-safe">
        <AgentStatus text={agentStatusText} />
        {segments.length > 0 && (
          <div className="max-w-[540px] mx-auto mt-1 sm:mt-2 mb-2 sm:mb-4">
            <TranscriptConsole segments={segments} />
          </div>
        )}
        <div className="mt-2 sm:mt-3 mb-1">
          <ConnectButton
            status={status}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </div>
    </div>
  )
}
