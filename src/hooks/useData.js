import { useMemo } from 'react'
import dbRaw from '../data/db.json'
import { runSql } from '../sql/engine.js'
import { QUERIES, NGAY_HIEN_TAI } from '../data/queries.js'

export const DB = dbRaw
export { NGAY_HIEN_TAI }

/** Chạy toàn bộ 24 truy vấn một lần, ghi nhớ kết quả. */
export function useQueryResults() {
  return useMemo(() => {
    const params = { '@NgayHienTai': NGAY_HIEN_TAI }
    const map = new Map()
    for (const q of QUERIES) {
      try {
        const res = runSql(DB, q.sql, params)
        map.set(q.id, { ok: true, columns: res.columns, rows: res.rows })
      } catch (e) {
        map.set(q.id, { ok: false, error: e.message, columns: [], rows: [] })
      }
    }
    return map
  }, [])
}

/** Thống kê tổng quan toàn hệ thống cho trang chủ. */
export function useOverview() {
  return useMemo(() => {
    const tranDau = DB.TranDau
    const finished = tranDau.filter((t) => t.TrangThai === 'Đã kết thúc')
    const won = finished.filter((t) => t.SoBanThang > t.SoBanThua).length
    const drawn = finished.filter((t) => t.SoBanThang === t.SoBanThua).length
    const lost = finished.filter((t) => t.SoBanThang < t.SoBanThua).length
    const goalsFor = finished.reduce((a, t) => a + (t.SoBanThang || 0), 0)
    const goalsAgainst = finished.reduce((a, t) => a + (t.SoBanThua || 0), 0)

    const banDaBan = DB.Ve.filter((v) => v.TrangThai !== 'Đã huỷ')
    const revenue = banDaBan.reduce((a, v) => a + v.GiaBan, 0)
    const totalSeats = DB.KhanDai.reduce((a, k) => a + k.SucChua, 0)

    const activeContracts = DB.HopDongLaoDong.filter(
      (h) => h.TrangThai === 'Hiệu lực' && h.NgayBatDau <= NGAY_HIEN_TAI && h.NgayKetThuc >= NGAY_HIEN_TAI
    )
    const payroll = activeContracts.reduce((a, h) => a + h.LuongThang, 0)

    const injured = DB.ChanThuong.filter((c) => c.NgayTroLaiThucTe === null)

    // Top cầu thủ ghi bàn
    const scorers = DB.SuKienTranDau
      .filter((s) => s.LoaiSuKien === 'Bàn thắng')
      .reduce((acc, s) => {
        acc[s.CT_MaNhanSu] = (acc[s.CT_MaNhanSu] || 0) + 1
        return acc
      }, {})
    const nsById = Object.fromEntries(DB.NhanSu.map((n) => [n.MaNhanSu, n]))
    const topScorers = Object.entries(scorers)
      .map(([id, goals]) => ({ id, goals, name: nsById[id]?.HoTen ?? id }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 8)

    // Biểu đồ kết quả theo mùa
    const bySeason = {}
    for (const t of finished) {
      const g = DB.GiaiDau.find((x) => x.MaGiaiDau === t.MaGiaiDau)
      if (!g) continue
      const key = `${g.TenGiai} ${g.MuaGiai}`
      bySeason[key] = bySeason[key] || { key, win: 0, draw: 0, loss: 0, gf: 0, ga: 0 }
      bySeason[key].gf += t.SoBanThang || 0
      bySeason[key].ga += t.SoBanThua || 0
      if (t.SoBanThang > t.SoBanThua) bySeason[key].win++
      else if (t.SoBanThang === t.SoBanThua) bySeason[key].draw++
      else bySeason[key].loss++
    }

    // Trận sắp tới
    const upcoming = tranDau
      .filter((t) => t.TrangThai === 'Sắp diễn ra')
      .sort((a, b) => a.ThoiGianThiDau.localeCompare(b.ThoiGianThiDau))

    // Thẻ phạt theo cầu thủ
    const cards = DB.SuKienTranDau
      .filter((s) => s.LoaiSuKien === 'Thẻ vàng' || s.LoaiSuKien === 'Thẻ đỏ')
      .reduce((acc, s) => {
        acc[s.CT_MaNhanSu] = acc[s.CT_MaNhanSu] || { yellow: 0, red: 0 }
        if (s.LoaiSuKien === 'Thẻ vàng') acc[s.CT_MaNhanSu].yellow++
        else acc[s.CT_MaNhanSu].red++
        return acc
      }, {})

    return {
      matches: { total: tranDau.length, finished: finished.length, won, drawn, lost },
      goals: { for: goalsFor, against: goalsAgainst, diff: goalsFor - goalsAgainst },
      tickets: { sold: banDaBan.length, revenue, capacity: totalSeats },
      payroll: { total: payroll, contracts: activeContracts.length },
      injured: injured.length,
      topScorers,
      bySeason: Object.values(bySeason),
      upcoming,
      cards: Object.entries(cards)
        .map(([id, v]) => ({ id, name: nsById[id]?.HoTen ?? id, ...v }))
        .sort((a, b) => b.red - a.red || b.yellow - a.yellow)
        .slice(0, 8),
      squadSize: DB.CauThu.length,
      staffSize: DB.HuanLuyenVien.length + DB.NhanVienVanPhong.length,
      competitions: DB.GiaiDau.length,
      accounts: DB.TaiKhoan.length,
      articles: DB.TinTuc.length,
    }
  }, [])
}
