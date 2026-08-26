interface ProgressBarProps {
  completed: number
  total: number
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div>
      <div className="mb-2 flex justify-between text-[13px] text-text-muted">
        <span>
          {completed} de {total} itens
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-250"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
