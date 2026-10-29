import {
  Trophy,
  Target,
  Ticket,
  Wallet,
  HeartPulse,
  Users,
  Newspaper,
  CalendarClock,
  ArrowUpRight,
  Square,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts'
import { useOverview, NGAY_HIEN_TAI } from '../hooks/useData'
import { fmtVND, fmtDateTime } from '../lib/format'
import Chip from '../components/Chip'

const GRENAT = 'var(--color-grenat)'
const GARNET = 'var(--color-garnet)'
const AMBER = 'var(--color-amber-club)'

export default function Overview({ onNavigate }) {
  const ov = useOverview()

  const winPct = ov.matches.finished
    ? Math.round((ov.matches.won / ov.matches.finished) * 100)
    : 0

  return (
    <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
      {/* ============ Tiêu đề ============ */}
      <section className="pt-14 pb-10 sm:pt-20 sm:pb-14">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Mốc dữ liệu · {NGAY_HIEN_TAI}
            </p>
            <h1 className="mt-4 text-balance font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-[var(--color-ink)]">
              Toàn cảnh
              <span className="text-[var(--color-garnet)]"> FC&nbsp;Barcelona</span>
              <br />
              trong một màn hình.
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
              21 quan hệ chuẩn hoá 3NF, 24 truy vấn báo cáo và{' '}
              {ov.matches.total} trận đấu được nạp trực tiếp từ tệp SQL gốc của
              nhóm. Mọi con số dưới đây đều được tính bằng engine SQL nội bộ, không
              hard-code.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('truy-van')}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-grenat)] px-5 py-3 text-sm font-semibold text-[var(--color-paper-pure)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--color-grenat-deep)] active:translate-y-0"
              >
                Mở 24 truy vấn
                <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() => onNavigate('luoc-do')}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] px-5 py-3 text-sm font-semibold text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-grenat)] hover:text-[var(--color-grenat)]"
              >
                Xem lược đồ CSDL
              </button>
            </div>
          </div>

          {/* Thẻ tổng kết */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-line)]">
            <StatTile
              label="Thắng / Hoà / Thua"
              value={`${ov.matches.won}·${ov.matches.drawn}·${ov.matches.lost}`}
              note={`${ov.matches.finished} trận đã kết thúc`}
              icon={Trophy}
              accent={GRENAT}
            />
            <StatTile
              label="Hiệu số bàn thắng"
              value={`${ov.goals.for} : ${ov.goals.against}`}
              note={`${ov.goals.diff >= 0 ? '+' : ''}${ov.goals.diff} chênh lệch`}
              icon={Target}
              accent={GARNET}
            />
            <StatTile
              label="Doanh thu vé"
              value={fmtVND(ov.tickets.revenue)}
              note={`${ov.tickets.sold} vé đã bán`}
              icon={Ticket}
              accent={AMBER}
            />
            <StatTile
              label="Quỹ lương / tháng"
              value={fmtVND(ov.payroll.total)}
              note={`${ov.payroll.contracts} hợp đồng hiệu lực`}
              icon={Wallet}
              accent="oklch(0.66 0.13 160)"
            />
          </div>
        </div>
      </section>

      {/* ============ Dải số liệu nhỏ ============ */}
      <section className="grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Cầu thủ', value: ov.squadSize, icon: Users },
          { label: 'Ban huấn luyện', value: ov.staffSize, icon: Users },
          { label: 'Giải đấu', value: ov.competitions, icon: Trophy },
          { label: 'Tài khoản', value: ov.accounts, icon: Users },
          { label: 'Bài viết', value: ov.articles, icon: Newspaper },
          { label: 'Đang chấn thương', value: ov.injured, icon: HeartPulse },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--color-paper-pure)] px-5 py-4"
          >
            <s.icon size={14} className="text-[var(--color-ink-faint)]" />
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums tracking-tight text-[var(--color-ink)]">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ============ Biểu đồ + bảng xếp hạng ============ */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">
                Thành tích theo giải
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
                Thắng · Hoà · Thua ở từng giải đấu
              </p>
            </div>
            <div className="flex gap-3 text-xs text-[var(--color-ink-soft)]">
              <Legend color={GRENAT} label="Thắng" />
              <Legend color="oklch(0.78 0.03 255)" label="Hoà" />
              <Legend color={GARNET} label="Thua" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ov.bySeason}
                margin={{ top: 4, right: 4, bottom: 4, left: -18 }}
                barCategoryGap="26%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-line-soft)"
                  strokeDasharray="2 4"
                />
                <XAxis
                  dataKey="key"
                  tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-28}
                  textAnchor="end"
                  height={62}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'color-mix(in oklch, var(--color-grenat) 7%, transparent)' }}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-line)',
                    background: 'var(--color-paper-pure)',
                    fontSize: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,.08)',
                  }}
                />
                <Bar dataKey="win" name="Thắng" stackId="a" fill={GRENAT} radius={[0, 0, 0, 0]} />
                <Bar dataKey="draw" name="Hoà" stackId="a" fill="oklch(0.78 0.03 255)" />
                <Bar
                  dataKey="loss"
                  name="Thua"
                  stackId="a"
                  fill={GARNET}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vua phá lưới */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">
            Vua phá lưới
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
            Bàn thắng theo cầu thủ
          </p>
          <ol className="mt-5 space-y-1">
            {ov.topScorers.map((s, i) => {
              const max = ov.topScorers[0]?.goals || 1
              return (
                <li
                  key={s.id}
                  className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition-colors hover:bg-[var(--color-grenat-mist)]"
                >
                  <span className="w-5 shrink-0 font-display text-xs font-bold tabular-nums text-[var(--color-ink-faint)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)]">
                    {s.name}
                  </span>
                  <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                    <span
                      className="block h-full rounded-full bg-[var(--color-garnet)] transition-[width] duration-700 ease-[var(--ease-out-quart)]"
                      style={{ width: `${(s.goals / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right font-mono text-sm font-medium tabular-nums text-[var(--color-ink)]">
                    {s.goals}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* ============ Trận sắp tới + thẻ phạt ============ */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">
            Lịch thi đấu sắp tới
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
            {ov.upcoming.length} trận đang chờ diễn ra
          </p>
          <ul className="mt-5 divide-y divide-[var(--color-line-soft)]">
            {ov.upcoming.slice(0, 5).map((t) => {
              const g = ov.upcoming.length ? t : t
              return <MatchRow key={t.MaTran} t={t} />
            })}
            {!ov.upcoming.length && (
              <li className="py-8 text-center text-sm text-[var(--color-ink-faint)]">
                Không có trận nào sắp diễn ra.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">
            Kỷ luật
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
            Thẻ vàng · thẻ đỏ
          </p>
          <ul className="mt-5 space-y-1">
            {ov.cards.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition-colors hover:bg-[var(--color-grenat-mist)]"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)]">
                  {c.name}
                </span>
                {c.yellow > 0 && (
                  <Chip value={`${c.yellow} vàng`} tone="warn" />
                )}
                {c.red > 0 && <Chip value={`${c.red} đỏ`} tone="danger" />}
                {!c.yellow && !c.red && (
                  <span className="text-xs text-[var(--color-ink-faint)]">—</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ Tỉ lệ thắng ============ */}
      <section className="mt-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-grenat-deep)] text-[var(--color-grenat-mist)]">
        <div className="grid gap-8 px-8 py-9 sm:px-12 lg:grid-cols-[auto_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-grenat-soft)]">
              Tỉ lệ thắng toàn mùa
            </p>
            <p className="mt-2 font-display text-[clamp(3rem,9vw,5.5rem)] font-extrabold leading-none tracking-tight text-[var(--color-paper-pure)]">
              {winPct}
              <span className="text-[var(--color-garnet)]">%</span>
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { label: 'Trận thắng', value: ov.matches.won, color: 'var(--color-grenat)' },
              { label: 'Trận hoà', value: ov.matches.drawn, color: 'oklch(0.55 0.05 255)' },
              { label: 'Trận thua', value: ov.matches.lost, color: 'var(--color-garnet)' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-baseline gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="font-display text-3xl font-extrabold tabular-nums text-[var(--color-paper-pure)]">
                    {s.value}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-grenat-soft)]">{s.label}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color-mix(in_oklch,var(--color-grenat-mist)_15%,transparent)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-paper-pure)]"
                    style={{
                      width: `${(s.value / (ov.matches.finished || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- */
function StatTile({ label, value, note, icon: Icon, accent }) {
  return (
    <div className="bg-[var(--color-paper-pure)] px-5 py-5">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: accent }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          {label}
        </span>
      </div>
      <p className="mt-3 font-display text-[clamp(1.25rem,2.4vw,1.6rem)] font-extrabold leading-tight tracking-tight text-[var(--color-ink)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--color-ink-faint)]">{note}</p>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function MatchRow({ t }) {
  const db = getMatchInfo(t)
  return (
    <li className="flex items-center gap-4 py-3.5">
      <div className="w-14 shrink-0">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {t.MaTran}
        </p>
        <p className="mt-0.5 font-display text-xs font-bold text-[var(--color-ink-soft)]">
          {db.round}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
          FC Barcelona <span className="text-[var(--color-ink-faint)]">vs</span>{' '}
          {db.opponent}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-ink-faint)]">
          {db.competition} · {fmtDateTime(t.ThoiGianThiDau)}
        </p>
      </div>
      <Chip value={t.TrangThai} tone="info" />
    </li>
  )
}

/* Tra cứu tên đối thủ / giải từ dữ liệu gốc */
import { DB } from '../hooks/useData'
function getMatchInfo(t) {
  const clb = DB.CauLacBo.find((c) => c.MaCLB === t.MaCLB)
  const gd = DB.GiaiDau.find((g) => g.MaGiaiDau === t.MaGiaiDau)
  return {
    opponent: clb?.TenCLB ?? '—',
    competition: gd ? `${gd.TenGiai} ${gd.MuaGiai}` : '—',
    round: typeof t.VongDau === 'number' ? `Vòng ${t.VongDau}` : t.VongDau,
  }
}
