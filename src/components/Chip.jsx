import { statusTone } from '../lib/format'

const TONE_CLASS = {
  ok: 'bg-[var(--color-grenat-mist)] text-[var(--color-grenat-deep)] border-[color-mix(in_oklch,var(--color-grenat)_22%,transparent)]',
  info: 'bg-[var(--color-garnet-soft)] text-[var(--color-garnet-deep)] border-[color-mix(in_oklch,var(--color-garnet)_22%,transparent)]',
  warn: 'bg-[oklch(0.95_0.06_85)] text-[oklch(0.42_0.12_60)] border-[oklch(0.85_0.09_80)]',
  danger: 'bg-[oklch(0.94_0.045_25)] text-[oklch(0.44_0.17_25)] border-[oklch(0.86_0.07_25)]',
  accent: 'bg-[var(--color-grenat)] text-[var(--color-grenat-mist)] border-transparent',
  muted: 'bg-[var(--color-line-soft)] text-[var(--color-ink-soft)] border-[var(--color-line)]',
  neutral: 'bg-[var(--color-line-soft)] text-[var(--color-ink-soft)] border-[var(--color-line)]',
  event: 'bg-[var(--color-paper-pure)] text-[var(--color-ink)] border-[var(--color-line)]',
}

export default function Chip({ value, tone, children }) {
  const t = tone || statusTone(children ?? value)
  return (
    <span className={`chip ${TONE_CLASS[t] || TONE_CLASS.neutral}`}>
      {children ?? value}
    </span>
  )
}

export { TONE_CLASS }
