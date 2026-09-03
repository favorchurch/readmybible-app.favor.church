export function ProgressBar({ value, max, pale = false }: { value: number; max: number; pale?: boolean }) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress-track ${pale ? "pale" : ""}`} aria-label={`${value} of ${max}`}>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}
