import type { ConnectionStatus } from './StatusBadge'

interface ConnectButtonProps {
  status: ConnectionStatus
  onConnect: () => void
  onDisconnect: () => void
}

export default function ConnectButton({ status, onConnect, onDisconnect }: ConnectButtonProps) {
  const isConnected = status === 'connected'
  const isLoading = status === 'connecting'

  return (
    <button
      onClick={isConnected ? onDisconnect : onConnect}
      disabled={isLoading}
      className={`px-8 sm:px-10 py-3 sm:py-3.5 border-none rounded-full sm:rounded-xl text-sm sm:text-base font-semibold cursor-pointer transition-all min-w-[140px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        isConnected
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isLoading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
    </button>
  )
}
