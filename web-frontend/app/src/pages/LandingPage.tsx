import { Link } from 'react-router-dom'

const modes = [
  {
    href: '/pipeline',
    title: 'Pipeline',
    description: 'OpenAI STT \u2192 GPT-4o-mini \u2192 TTS',
  },
  {
    href: '/realtime',
    title: 'Realtime',
    description: 'OpenAI Realtime API (speech-to-speech)',
  },
]

export default function LandingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-[540px] w-full px-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">LiveKit Voice Agent</h1>
        <p className="text-sm text-muted mb-8">Self-hosted on Railway</p>

        <div className="flex flex-col gap-4">
          {modes.map((m) => (
            <Link
              key={m.href}
              to={m.href}
              className="block p-6 bg-surface border border-border rounded-xl no-underline text-foreground transition-all hover:border-blue-500 hover:bg-[#1e1e2e]"
            >
              <h2 className="text-lg font-semibold text-white mb-2">{m.title}</h2>
              <p className="text-sm text-muted">{m.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
