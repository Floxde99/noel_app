export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-red-900 to-green-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl animate-bounce mb-4">🎄</div>
        <div className="text-white text-xl font-semibold">Chargement...</div>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
        </div>
      </div>
    </div>
  )
}
