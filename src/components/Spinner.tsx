export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block size-[18px] animate-spin rounded-full border-2 border-current/40 border-t-current ${className}`}
      aria-label="Carregando"
    />
  )
}
