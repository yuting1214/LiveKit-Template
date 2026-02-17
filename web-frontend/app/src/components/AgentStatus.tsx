interface AgentStatusProps {
  text: string
}

export default function AgentStatus({ text }: AgentStatusProps) {
  if (!text) return null
  return <p className="mt-3 sm:mt-6 text-xs sm:text-sm text-neutral-500">{text}</p>
}
