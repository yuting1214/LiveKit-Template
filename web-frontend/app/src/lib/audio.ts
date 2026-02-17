export interface AnalyserSetup {
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
  gain?: GainNode
}

export function createAnalyserFromStream(
  audioCtx: AudioContext,
  stream: MediaStream,
  isMic: boolean,
): AnalyserSetup {
  const source = audioCtx.createMediaStreamSource(stream)
  const analyser = audioCtx.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.7

  if (isMic) {
    const gain = audioCtx.createGain()
    gain.gain.value = 4.0
    analyser.minDecibels = -90
    analyser.maxDecibels = -10
    source.connect(gain).connect(analyser)
    return { analyser, source, gain }
  }

  source.connect(analyser)
  return { analyser, source }
}

export function getRmsLevel(analyser: AnalyserNode, dataArray: Uint8Array<ArrayBuffer>): number {
  analyser.getByteFrequencyData(dataArray)
  let sum = 0
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 255
    sum += v * v
  }
  return Math.sqrt(sum / dataArray.length)
}
