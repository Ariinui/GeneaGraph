import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error:', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[#16213e] border border-[#f4d03f] rounded-lg p-4 shadow-xl z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f4d03f] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#1a1a2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white font-medium text-sm">Nouvelle version disponible</p>
          <p className="text-gray-400 text-xs mt-1">Mettez à jour pour profiter des dernières améliorations</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 bg-[#f4d03f] hover:bg-[#d4a017] text-[#1a1a2e] font-medium text-sm py-2 px-3 rounded-md transition-colors"
        >
          Mettre à jour
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
