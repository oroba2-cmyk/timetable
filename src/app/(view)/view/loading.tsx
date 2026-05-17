export default function ViewLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      <div className="h-[480px] bg-gray-50 rounded-lg border animate-pulse" />
    </div>
  )
}
