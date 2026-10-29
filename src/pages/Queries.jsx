import { useMemo, useState } from 'react'
import {
  Search,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  Play,
  Code2,
  Table2,
} from 'lucide-react'
import { QUERIES } from '../data/queries.js'
import { useQueryResults } from '../hooks/useData'
import { highlightSQL, GROUP_META } from '../lib/format'
import DataTable from '../components/DataTable'

const GROUPS = [...new Set(QUERIES.map((q) => q.group))]

export default function Queries() {
  const results = useQueryResults()
  const [activeId, setActiveId] = useState(1)
  const [term, setTerm] = useState('')
  const [group, setGroup] = useState('Tất cả')
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase()
    return QUERIES.filter((item) => {
      const okGroup = group === 'Tất cả' || item.group === group
      const okTerm =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.purpose.toLowerCase().includes(q) ||
        item.sql.toLowerCase().includes(q)
      return okGroup && okTerm
    })
  }, [term, group])

  const active = QUERIES.find((q) => q.id === activeId) ?? QUERIES[0]
  const result = results.get(active.id)

  const copySQL = () => {
    navigator.clipboard?.writeText(active.sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
      {/* ============ Tiêu đề ============ */}
      <section className="pt-12 pb-8 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          Phần VI · Các truy vấn dữ liệu
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <h1 className="max-w-[18ch] font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold leading-[1] tracking-[-0.03em] text-[var(--color-ink)]">
            24 truy vấn, chạy thật.
          </h1>
          <p className="max-w-[46ch] text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
            Mỗi truy vấn dưới đây được viết đúng theo tài liệu và thực thi bằng
            engine SQL nội bộ trên dữ liệu 21 bảng — kết quả trả về khớp với
            ảnh Result Grid đã ghi trong báo cáo.
          </p>
        </div>
      </section>

      {/* ============ Bộ lọc ============ */}
      <section className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] pointer-events-none"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tìm truy vấn…"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] py-2 pl-9 pr-3 text-sm placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-grenat)] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Tất cả', ...GROUPS].map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                group === g
                  ? 'bg-[var(--color-grenat)] text-[var(--color-paper-pure)]'
                  : 'border border-[var(--color-line)] bg-[var(--color-paper-pure)] text-[var(--color-ink-soft)] hover:border-[var(--color-grenat)] hover:text-[var(--color-grenat)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* ============ Danh sách + kết quả ============ */}
      <section className="grid gap-6 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
        {/* Danh sách truy vấn */}
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1 no-scrollbar">
          <ol className="space-y-1">
            {filtered.map((q) => {
              const isActive = q.id === activeId
              const r = results.get(q.id)
              const tint = GROUP_META[q.group]?.tint ?? 'var(--color-grenat)'
              return (
                <li key={q.id}>
                  <button
                    onClick={() => setActiveId(q.id)}
                    className={`group flex w-full items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--color-grenat-deep)] text-[var(--color-paper-pure)]'
                        : 'hover:bg-[var(--color-grenat-mist)]'
                    }`}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: isActive ? tint : 'var(--color-line)' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span
                          className={`font-mono text-[10px] tabular-nums ${
                            isActive
                              ? 'text-[var(--color-grenat-soft)]'
                              : 'text-[var(--color-ink-faint)]'
                          }`}
                        >
                          {String(q.id).padStart(2, '0')}
                        </span>
                        <span
                          className={`truncate text-sm font-medium ${
                            isActive
                              ? 'text-[var(--color-paper-pure)]'
                              : 'text-[var(--color-ink)]'
                          }`}
                        >
                          {q.title}
                        </span>
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] ${
                          isActive
                            ? 'text-[var(--color-grenat-soft)]'
                            : 'text-[var(--color-ink-faint)]'
                        }`}
                      >
                        {q.group} · {r?.rows?.length ?? 0} dòng
                      </span>
                    </span>
                    <ChevronRight
                      size={14}
                      className={`mt-1 shrink-0 transition-transform ${
                        isActive
                          ? 'translate-x-0.5 text-[var(--color-grenat-soft)]'
                          : 'text-[var(--color-line)] group-hover:translate-x-0.5'
                      }`}
                    />
                  </button>
                </li>
              )
            })}
            {!filtered.length && (
              <li className="px-3 py-8 text-center text-sm text-[var(--color-ink-faint)]">
                Không tìm thấy truy vấn phù hợp.
              </li>
            )}
          </ol>
        </aside>

        {/* Chi tiết truy vấn */}
        <div className="min-w-0">
          <QueryDetail
            key={active.id}
            query={active}
            result={result}
            onCopy={copySQL}
            copied={copied}
          />
        </div>
      </section>
    </div>
  )
}

/* ======================================================================== */
function QueryDetail({ query, result, onCopy, copied }) {
  const [view, setView] = useState('result') // 'result' | 'sql'

  return (
    <article className="fade-in">
      {/* Tiêu đề truy vấn */}
      <header className="rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--color-line)] bg-[var(--color-paper-pure)] px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-[var(--color-grenat)] px-2.5 py-1 font-mono text-[10px] font-bold tabular-nums text-[var(--color-paper-pure)]">
                Q{String(query.id).padStart(2, '0')}
              </span>
              <span className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-soft)]">
                {query.group}
              </span>
              {result?.ok && (
                <span className="rounded-full border border-[color-mix(in_oklch,var(--color-grenat)_25%,transparent)] bg-[var(--color-grenat-mist)] px-2.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-[var(--color-grenat-deep)]">
                  {result.rows.length} dòng
                </span>
              )}
            </div>
            <h2 className="mt-3 font-display text-[clamp(1.35rem,3vw,1.9rem)] font-extrabold leading-tight tracking-tight text-[var(--color-ink)]">
              {query.title}
            </h2>
            <p className="mt-2.5 max-w-[68ch] text-pretty text-sm leading-relaxed text-[var(--color-ink-soft)]">
              {query.purpose}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)]">
              <button
                onClick={() => setView('result')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                  view === 'result'
                    ? 'bg-[var(--color-grenat-deep)] text-[var(--color-paper-pure)]'
                    : 'bg-[var(--color-paper-pure)] text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]'
                }`}
              >
                <Table2 size={13} />
                Kết quả
              </button>
              <button
                onClick={() => setView('sql')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                  view === 'sql'
                    ? 'bg-[var(--color-grenat-deep)] text-[var(--color-paper-pure)]'
                    : 'bg-[var(--color-paper-pure)] text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]'
                }`}
              >
                <Code2 size={13} />
                SQL
              </button>
            </div>
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-grenat)] hover:text-[var(--color-grenat)]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Đã copy' : 'Copy'}
            </button>
          </div>
        </div>
      </header>

      {/* Nội dung */}
      <div className="rounded-b-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6 sm:p-8">
        {view === 'sql' ? (
          <div className="overflow-hidden rounded-[var(--radius-md)]">
            <div className="flex items-center gap-2 border-b border-[color-mix(in_oklch,var(--color-grenat)_25%,transparent)] bg-[var(--color-grenat-deep)] px-4 py-2.5">
              <Terminal size={13} className="text-[var(--color-grenat-soft)]" />
              <span className="font-mono text-[11px] text-[var(--color-grenat-soft)]">
                mysql&gt; truy_van_{String(query.id).padStart(2, '0')}.sql
              </span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--color-grenat-soft)]">
                MySQL 8.0
              </span>
            </div>
            <pre
              className="sql-block m-0"
              dangerouslySetInnerHTML={{ __html: highlightSQL(query.sql) }}
            />
          </div>
        ) : result?.ok ? (
          <DataTable
            columns={result.columns}
            rows={result.rows}
            format={query.format || {}}
            badges={query.badges || {}}
            progressBar={query.progressBar || null}
          />
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[oklch(0.86_0.07_25)] bg-[oklch(0.96_0.03_25)] px-5 py-4">
            <p className="font-display text-sm font-bold text-[oklch(0.44_0.17_25)]">
              Không thực thi được truy vấn
            </p>
            <p className="mt-1 font-mono text-xs text-[oklch(0.5_0.15_25)]">
              {result?.error}
            </p>
          </div>
        )}
      </div>

      {/* Chú thích kỹ thuật */}
      {view === 'result' && result?.ok && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-[11px] text-[var(--color-ink-faint)]">
          <span className="inline-flex items-center gap-1.5">
            <Play size={11} />
            Engine SQL nội bộ · kết quả tính từ {result.rows.length} dòng nguồn
          </span>
          <span className="font-mono">
            {result.columns.length} cột · {result.columns.map((c) => c).slice(0, 3).join(', ')}
            {result.columns.length > 3 ? '…' : ''}
          </span>
        </div>
      )}
    </article>
  )
}
