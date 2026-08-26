export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block size-[18px] animate-spin rounded-full border-2 border-white/40 border-t-current ${className}`}
    />
  )
}
