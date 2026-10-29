import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { useMemo, useState } from 'react'
import { DB, useOverview, useQueryResults } from '../hooks/useData'
import { QUERIES } from '../data/queries.js'
import { fmtVND } from '../lib/format'

const GRENAT = '#1f3d78'
const GRENAT_SOFT = '#4a6fb0'
const GARNET = '#a8322f'
const AMBER = '#d99b30'
const TEAL = '#2f8f7a'
const PLUM = '#7a4a8f'

const PALETTE = [GRENAT, GARNET, AMBER, TEAL, PLUM, GRENAT_SOFT]

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid var(--color-line)',
  background: 'var(--color-paper-pure)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,.08)',
}

export default function Charts() {
  const ov = useOverview()
  const results = useQueryResults()
  const [tab, setTab] = useState('doanh-thu')

  /* --- Doanh thu vé theo trận (Q20) --- */
  const revenueData = useMemo(() => {
    const r = results.get(20)
    if (!r?.ok) return []
    // Dùng dòng "Cả trận" (dòng ROLLUP cấp 1) để mỗi trận chỉ có 1 cột
    const rows = r.rows.filter((x) => x.KhanDai === 'Cả trận')
    return rows
      .map((x) => ({ name: x.MaTran, value: x.DoanhThu, soVe: x.SoVe }))
      .sort((a, b) => b.value - a.value)
  }, [results])

  /* --- Bàn thắng theo cầu thủ (Q12) --- */
  const scorerData = useMemo(() => {
    const r = results.get(12)
    if (!r?.ok) return []
    const map = new Map()
    for (const row of r.rows) {
      const key = row.HoTen
      const e = map.get(key) || { name: key, BanThang: 0, KienTao: 0 }
      e.BanThang += row.BanThang || 0
      e.KienTao += row.KienTao || 0
      map.set(key, e)
    }
    return [...map.values()].sort((a, b) => b.BanThang - a.BanThang).slice(0, 12)
  }, [results])

  /* --- Thẻ phạt (Q14) --- */
  const cardData = useMemo(() => {
    const r = results.get(14)
    if (!r?.ok) return []
    const map = new Map()
    for (const row of r.rows) {
      const key = row.HoTen
      const e = map.get(key) || { name: key, TheVang: 0, TheDo: 0 }
      e.TheVang += row.TheVang || 0
      e.TheDo += row.TheDo || 0
      map.set(key, e)
    }
    return [...map.values()].sort((a, b) => b.TheDo - a.TheDo || b.TheVang - a.TheVang).slice(0, 10)
  }, [results])

  /* --- Hiệu số theo giải (Q8) --- */
  const seasonData = useMemo(() => {
    const r = results.get(8)
    if (!r?.ok) return []
    return r.rows.map((x) => ({
      name: `${x.TenGiai} ${x.MuaGiai}`,
      Thang: x.Thang, Hoa: x.Hoa, Thua: x.Thua,
      HieuSo: x.HieuSo,
      BanThang: x.BanThang, BanThua: x.BanThua,
    }))
  }, [results])

  /* --- Phân bố quỹ lương (Q22) --- */
  const payrollData = useMemo(() => {
    const r = results.get(22)
    if (!r?.ok) return []
    return r.rows.map((x) => ({ name: x.LoaiNhanSu, value: x.TongQuyLuongThang }))
  }, [results])

  /* --- Phân bố vị trí cầu thủ --- */
  const positionData = useMemo(() => {
    const m = {}
    for (const c of DB.CauThu) m[c.ViTri] = (m[c.ViTri] || 0) + 1
    const order = ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo']
    return order
      .filter((k) => m[k])
      .map((k) => ({ name: k, value: m[k] }))
  }, [])

  /* --- Phân bố quốc tịch cầu thủ --- */
  const nationData = useMemo(() => {
    const m = {}
    for (const c of DB.CauThu) {
      const ns = DB.NhanSu.find((n) => n.MaNhanSu === c.CT_MaNhanSu)
      if (ns) m[ns.QuocTich] = (m[ns.QuocTich] || 0) + 1
    }
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [])

  /* --- Phút thi đấu (Q13) --- */
  const minutesData = useMemo(() => {
    const r = results.get(13)
    if (!r?.ok) return []
    return r.rows.slice(0, 14).map((x) => ({
      name: x.HoTen.split(' ').slice(-1)[0],
      TongSoPhut: x.TongSoPhut,
      SoTranRaSan: x.SoTranRaSan,
    }))
  }, [results])

  const TABS = [
    { id: 'doanh-thu', label: 'Doanh thu vé' },
    { id: 'scorer', label: 'Phá lưới' },
    { id: 'the', label: 'Thẻ phạt' },
    { id: 'mua', label: 'Mùa giải' },
    { id: 'luong', label: 'Quỹ lương' },
    { id: 'doi-hinh', label: 'Đội hình' },
  ]

  return (
    <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <section className="pt-12 pb-8 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          Ứng dụng báo cáo &amp; thống kê
        </p>
        <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold leading-[1] tracking-[-0.03em] text-[var(--color-ink)]">
          Dữ liệu kể chuyện.
        </h1>
        <p className="mt-5 max-w-[62ch] text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          Mỗi biểu đồ dưới đây được sinh ra từ kết quả thực thi của một trong 24
          truy vấn báo cáo — không có số liệu nào được nhập tay.
        </p>
      </section>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-grenat)] text-[var(--color-paper-pure)]'
                : 'border border-[var(--color-line)] bg-[var(--color-paper-pure)] text-[var(--color-ink-soft)] hover:border-[var(--color-grenat)] hover:text-[var(--color-grenat)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="pb-16">
        {tab === 'doanh-thu' && (
          <ChartCard
            title="Doanh thu vé theo trận"
            note="Q20 · GROUP BY … WITH ROLLUP — vé đã huỷ không được tính"
          >
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1e6).toFixed(0)}tr`}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtVND(v)} />
                  <Bar dataKey="value" name="Doanh thu" fill={GRENAT} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {tab === 'scorer' && (
          <ChartCard
            title="Bàn thắng & kiến tạo"
            note="Q12 · Bảng xếp hạng ghi bàn theo mùa giải (cộng dồn toàn mùa)"
          >
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scorerData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} angle={-24} textAnchor="end" height={64} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="BanThang" name="Bàn thắng" stackId="a" fill={GRENAT} />
                  <Bar dataKey="KienTao" name="Kiến tạo" stackId="a" fill={GARNET} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {tab === 'the' && (
          <ChartCard
            title="Kỷ luật — thẻ vàng & thẻ đỏ"
            note="Q14 · Thống kê thẻ phạt của cầu thủ theo giải đấu"
          >
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cardData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} angle={-24} textAnchor="end" height={64} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="TheVang" name="Thẻ vàng" fill={AMBER} stackId="a" />
                  <Bar dataKey="TheDo" name="Thẻ đỏ" fill={GARNET} stackId="a" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {tab === 'mua' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Thắng · Hoà · Thua theo giải" note="Q8 · Thành tích CLB theo từng giải đấu">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonData} margin={{ top: 8, right: 8, bottom: 8, left: -14 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={78} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Thang" name="Thắng" stackId="a" fill={GRENAT} />
                    <Bar dataKey="Hoa" name="Hoà" stackId="a" fill="oklch(0.78 0.03 255)" />
                    <Bar dataKey="Thua" name="Thua" stackId="a" fill={GARNET} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Hiệu số bàn thắng" note="Q8 · Hiệu số = bàn thắng − bàn thua">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonData} margin={{ top: 8, right: 8, bottom: 8, left: -14 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={78} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="HieuSo" name="Hiệu số" radius={[6, 6, 0, 0]}>
                      {seasonData.map((d) => (
                        <Cell key={d.name} fill={d.HieuSo >= 0 ? GRENAT : GARNET} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}

        {tab === 'luong' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <ChartCard title="Quỹ lương hằng tháng" note="Q22 · Tổng quỹ lương theo loại nhân sự">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={payrollData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={3}>
                      {payrollData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmtVND(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Quy mô đội hình" note="Số cầu thủ theo vị trí thi đấu">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={positionData} outerRadius="72%">
                    <PolarGrid stroke="var(--color-line-soft)" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }} axisLine={false} />
                    <Radar dataKey="value" name="Cầu thủ" stroke={GRENAT} fill={GRENAT} fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}

        {tab === 'doi-hinh' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Tổng phút thi đấu" note="Q13 · Số phút tính bằng CTE, không lưu thuộc tính dẫn xuất">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={minutesData} margin={{ top: 8, right: 8, bottom: 8, left: -6 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} angle={-24} textAnchor="end" height={64} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v} phút`} />
                    <Bar dataKey="TongSoPhut" name="Tổng phút" fill={TEAL} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Cầu thủ theo quốc tịch" note="Q2 · Cầu thủ ngoại binh đang có hợp đồng hiệu lực">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={nationData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 24 }}
                  >
                    <CartesianGrid horizontal={false} stroke="var(--color-line-soft)" strokeDasharray="2 4" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-ink-faint)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" name="Cầu thủ" radius={[0, 6, 6, 0]}>
                      {nationData.map((d, i) => (
                        <Cell key={d.name} fill={i === 0 ? GARNET : PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}
      </section>
    </div>
  )
}

function ChartCard({ title, note, children }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-faint)]">{note}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}
