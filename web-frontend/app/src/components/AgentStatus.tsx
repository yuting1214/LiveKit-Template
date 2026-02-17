interface AgentStatusProps {
  text: string
}

export default function AgentStatus({ text }: AgentStatusProps) {
  if (!text) return null
  return <p className="mt-6 text-sm text-neutral-500">{text}</p>
}
