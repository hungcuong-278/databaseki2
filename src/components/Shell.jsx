import { useState, useEffect } from 'react'
import { LayoutDashboard, Database, Terminal, ShieldCheck, Menu, X } from 'lucide-react'

const NAV = [
  { id: 'tong-quan', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'truy-van', label: 'Truy vấn & Báo cáo', icon: Terminal },
  { id: 'do-ho', label: 'Đồ hoạ', icon: Database },
  { id: 'luoc-do', label: 'Lược đồ CSDL', icon: ShieldCheck },
]

export default function Shell({ active, onNavigate, children }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (id) => {
    onNavigate(id)
    setOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Thanh điều hướng */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[color-mix(in_oklch,var(--color-paper)_88%,transparent)] backdrop-blur-xl border-b border-[var(--color-line)]'
            : 'bg-[var(--color-paper)] border-b border-transparent'
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="flex h-16 items-center gap-4">
            {/* Logo */}
            <button
              onClick={() => go('tong-quan')}
              className="group flex items-center gap-3 shrink-0"
            >
              <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-grenat-deep)]">
                <span className="absolute inset-x-0 top-0 h-1/2 bg-[var(--color-garnet)]" />
                <span className="font-display text-[11px] font-extrabold tracking-tight text-[var(--color-paper-pure)] relative">
                  FCB
                </span>
              </span>
              <span className="hidden sm:block text-left leading-none">
                <span className="block font-display text-[15px] font-extrabold tracking-tight text-[var(--color-ink)]">
                  BarçaDesk
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
                  QLCLB · 3NF
                </span>
              </span>
            </button>

            {/* Điều hướng desktop */}
            <nav className="ml-6 hidden items-center gap-1 lg:flex">
              {NAV.map((n) => {
                const Icon = n.icon
                const isActive = active === n.id
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.id)}
                    className={`relative inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--color-grenat-deep)]'
                        : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                    {n.label}
                    {isActive && (
                      <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-grenat)]" />
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-pure)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-grenat)]"
                  style={{ animation: 'pulse-dot 2.4s ease-in-out infinite' }}
                />
                MySQL 8 · 21 bảng
              </span>
              <button
                onClick={() => setOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-ink-soft)] lg:hidden"
                aria-label="Menu"
              >
                {open ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {open && (
          <nav className="fade-in border-t border-[var(--color-line)] bg-[var(--color-paper-pure)] lg:hidden">
            <div className="mx-auto max-w-[1400px] px-5 py-3 sm:px-8">
              {NAV.map((n) => {
                const Icon = n.icon
                const isActive = active === n.id
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.id)}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-grenat-mist)] text-[var(--color-grenat-deep)]'
                        : 'text-[var(--color-ink-soft)]'
                    }`}
                  >
                    <Icon size={16} />
                    {n.label}
                  </button>
                )
              })}
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>

      {/* Chân trang */}
      <footer className="mt-20 border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <p className="font-display text-sm font-bold text-[var(--color-ink)]">
                BarçaDesk — Quản lý Câu lạc bộ bóng đá
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)] text-pretty">
                Giao diện React dựng trên 21 quan hệ chuẩn 3NF. Toàn bộ 24 truy vấn
                báo cáo chạy trực tiếp bằng engine SQL nội bộ trên tập dữ liệu trích
                xuất từ tệp SQL gốc.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Lược đồ
                </p>
                <p className="mt-2 tabular-nums text-[var(--color-ink-soft)]">
                  21 quan hệ · 3NF
                </p>
              </div>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Truy vấn
                </p>
                <p className="mt-2 tabular-nums text-[var(--color-ink-soft)]">
                  24 báo cáo
                </p>
              </div>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Mốc dữ liệu
                </p>
                <p className="mt-2 tabular-nums text-[var(--color-ink-soft)]">
                  04/10/2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
