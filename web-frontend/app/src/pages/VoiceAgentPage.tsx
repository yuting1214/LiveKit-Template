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
  pipeline: 'OpenAI STT \u2192 GPT-5.6 Luna \u2192 TTS',
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
    agentAudioTrack,
    audioContext,
    segments,
    connect,
    disconnect,
  } = useLiveKitSession(mode)

  // Mic RMS — still needed for debug monitor and aura mode derivation
  const { rmsRef: micRmsRef } = useAudioAnalyser(audioContext, localMicStream, true)
  // Agent RMS — only for debug monitor and aura mode derivation (Aura does its own FFT for visuals)
  const { rmsRef: agentRmsRef } = useAudioAnalyser(audioContext, agentAudioStream, false)

  // Derive aura mode from actual audio levels
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

      if (agentRms > SPEAKING_THRESHOLD && agentRms >= micRms) {
        mode = 'agent-speaking'
      } else if (micRms > SPEAKING_THRESHOLD) {
        mode = 'user-speaking'
      } else {
        mode = 'idle'
      }

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

      {/* Header */}
      <header className="shrink-0 pt-safe text-center px-4 pt-2 sm:pt-5 pb-0">
        <h1 className="text-sm sm:text-xl font-semibold text-white leading-tight">{titles[mode]}</h1>
        <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1">{subtitles[mode]}</p>
        <div className="mt-1.5 sm:mt-3">
          <ModeNav activeMode={mode} />
        </div>
        <StatusBadge status={status} roomName={roomName} />
      </header>

      {/* Aura + bottom controls — share remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Aura — shrinks when transcript is visible */}
        <div className="flex-1 min-h-[160px] flex items-center justify-center px-4">
          <AuraVisualizer auraMode={auraMode} agentTrack={agentAudioTrack} />
        </div>

        {/* Bottom controls */}
        <div className="shrink-0 px-4 pb-3 sm:pb-6 pb-safe text-center">
          <AgentStatus text={agentStatusText} />
          {segments.length > 0 && (
            <div className="max-w-[480px] mx-auto mb-2 sm:mb-3">
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
    </div>
  )
}
