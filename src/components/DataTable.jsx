import { useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X, Download } from 'lucide-react'
import Chip from './Chip'
import { humanizeColumn, isNumericColumn, statusTone } from '../lib/format'

/**
 * Bảng dữ liệu tổng quát:
 *  - sắp xếp theo cột
 *  - tìm kiếm toàn văn
 *  - xuất CSV
 *  - tự động định dạng số / tiền / ngày
 */
export default function DataTable({
  columns,
  rows,
  format = {},
  badges = {},
  progressBar = null,
  maxRows = 200,
}) {
  const [sort, setSort] = useState(null) // { col, dir }
  const [term, setTerm] = useState('')

  const numericCols = useMemo(() => {
    const m = {}
    for (const c of columns) m[c] = isNumericColumn(rows, c)
    return m
  }, [columns, rows])

  const filtered = useMemo(() => {
    if (!term.trim()) return rows
    const q = term.trim().toLowerCase()
    return rows.filter((r) =>
      columns.some((c) => String(r[c] ?? '').toLowerCase().includes(q))
    )
  }, [rows, columns, term])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const { col, dir } = sort
    const out = filtered.slice()
    out.sort((a, b) => {
      const av = a[col]
      const bv = b[col]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      let c
      if (typeof av === 'number' && typeof bv === 'number') c = av - bv
      else c = String(av).localeCompare(String(bv), 'vi')
      return dir === 'DESC' ? -c : c
    })
    return out
  }, [filtered, sort])

  const shown = sorted.slice(0, maxRows)

  const toggleSort = (col) => {
    setSort((s) =>
      s && s.col === col
        ? s.dir === 'ASC'
          ? { col, dir: 'DESC' }
          : null
        : { col, dir: 'ASC' }
    )
  }

  const exportCSV = () => {
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const head = columns.join(',')
    const body = sorted.map((r) => columns.map((c) => esc(r[c])).join(',')).join('\n')
    const blob = new Blob([`﻿${head}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ket-qua-truy-van.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderCell = (row, col) => {
    const raw = row[col]
    const fmt = format[col]

    if (progressBar && progressBar.value === col) {
      const ratio = Math.max(0, Math.min(1, Number(raw) || 0))
      return (
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-line-soft)] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quart)]"
              style={{
                width: `${ratio * 100}%`,
                background: 'linear-gradient(90deg, var(--color-grenat), var(--color-grenat-soft))',
              }}
            />
          </div>
          <span className="cell-num text-[var(--color-ink-soft)]">
            {typeof fmt === 'function' ? fmt(raw) : raw}
          </span>
        </div>
      )
    }

    if (badges[col] && raw !== null && raw !== undefined) {
      const mode = badges[col]
      if (mode === 'result') return <Chip value={raw} tone={statusTone(raw)} />
      if (mode === 'event') return <Chip value={raw} tone={statusTone(raw)} />
      if (
        ['info', 'accent', 'warn', 'danger', 'ok', 'neutral', 'muted'].includes(mode)
      ) {
        return <Chip value={raw} tone={mode} />
      }
      return <Chip value={raw} />
    }

    if (fmt) {
      let out = raw
      if (typeof fmt === 'function') out = fmt(raw)
      else if (fmt === 'vnd') out = formatVND(raw)
      else if (fmt === 'int') out = formatInt(raw)
      else if (fmt === 'days') out = formatDays(raw)
      return <span className={numericCols[col] ? 'cell-num' : ''}>{out}</span>
    }

    if (raw === null || raw === undefined) {
      return <span className="text-[var(--color-ink-faint)]">—</span>
    }

    if (numericCols[col]) {
      return (
        <span className="cell-num">
          {typeof raw === 'number' ? raw.toLocaleString('vi-VN') : raw}
        </span>
      )
    }

    return <span>{String(raw)}</span>
  }

  return (
    <div>
      {/* Thanh điều khiển */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] pointer-events-none"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tìm trong kết quả…"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] py-2 pl-9 pr-8 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-grenat)] focus:outline-none transition-colors"
          />
          {term && (
            <button
              onClick={() => setTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
              aria-label="Xoá tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--color-ink-faint)] tabular-nums">
            {sorted.length} dòng{term && ` (lọc từ ${rows.length})`}
          </span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] hover:border-[var(--color-grenat)] hover:text-[var(--color-grenat)] transition-colors"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      {/* Bảng */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-paper-pure)]">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.col === c
                const Icon = !active ? ArrowUpDown : sort.dir === 'ASC' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={c}
                    onClick={() => toggleSort(c)}
                    className={`cursor-pointer select-none hover:text-[var(--color-paper-pure)] transition-colors ${
                      numericCols[c] ? 'text-right' : ''
                    }`}
                    title={`Sắp xếp theo ${humanizeColumn(c)}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1 ${
                        numericCols[c] ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {humanizeColumn(c)}
                      <Icon size={11} className={active ? 'opacity-100' : 'opacity-30'} />
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c} className={numericCols[c] ? 'text-right' : ''}>
                    {renderCell(r, c)}
                  </td>
                ))}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <p className="font-display text-[var(--color-ink-soft)]">
                    Không có dòng nào khớp
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
                    Thử xoá từ khoá tìm kiếm hoặc đổi bộ lọc.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > shown.length && (
        <p className="mt-3 text-xs text-[var(--color-ink-faint)]">
          Đang hiển thị {shown.length} trên tổng {sorted.length} dòng — dùng ô tìm kiếm
          để lọc thêm.
        </p>
      )}
    </div>
  )
}

/* ---- helpers ---- */
function formatVND(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(v)
}
function formatInt(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('vi-VN').format(v)
}
function formatDays(v) {
  if (v === null || v === undefined) return '—'
  return `${v} ngày`
}
