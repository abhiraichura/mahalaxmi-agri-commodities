export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-2xl">M</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Mahalaxmi Contracts</h2>
        <p className="text-sm text-gray-500 mt-1">Loading your workspace...</p>
      </div>
    </div>
  );
}
