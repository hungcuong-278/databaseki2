import { useMemo, useState } from 'react'
import { Link2, Search, X } from 'lucide-react'
import { humanizeColumn } from '../lib/format'

/** Mô tả lược đồ: bảng -> cột, khoá ngoại tới bảng khác. */
const SCHEMA = [
  {
    table: 'ThanhPho', label: 'Thành phố', domain: '18b', rows: 17,
    cols: [['ThanhPho', 'PK'], ['QuocGia', '']],
    fks: [],
  },
  {
    table: 'CauLacBo', label: 'Câu lạc bộ', domain: '18a', rows: 20,
    cols: [['MaCLB', 'PK'], ['TenCLB', ''], ['ThanhPho', 'FK'], ['SanNha', ''], ['NamThanhLap', ''], ['Email', '']],
    fks: [['ThanhPho', 'ThanhPho']],
  },
  {
    table: 'CauLacBo_SoDienThoai', label: 'CLB – SĐT', domain: '19', rows: 20,
    cols: [['MaCLB', 'PK,FK'], ['SoDienThoai', 'PK']],
    fks: [['MaCLB', 'CauLacBo']],
  },
  {
    table: 'GiaiDau', label: 'Giải đấu', domain: '7', rows: 10,
    cols: [['MaGiaiDau', 'PK'], ['TenGiai', ''], ['MuaGiai', ''], ['LoaiGiai', ''], ['DonViToChuc', ''], ['NgayBatDau', ''], ['NgayKetThuc', '']],
    fks: [],
  },
  {
    table: 'KhanDai', label: 'Khán đài', domain: '5', rows: 5,
    cols: [['MaKhanDai', 'PK'], ['TenKhanDai', ''], ['SucChua', ''], ['GiaVeCoBan', ''], ['TrangThai', '']],
    fks: [],
  },
  {
    table: 'SanVanDong', label: 'Sân vận động', domain: '6b', rows: 12,
    cols: [['TenSanVanDong', 'PK'], ['DiaDiem', '']],
    fks: [],
  },
  {
    table: 'NhanSu', label: 'Nhân sự', domain: '10', rows: 54,
    cols: [['MaNhanSu', 'PK'], ['HoTen', ''], ['NgaySinh', ''], ['GioiTinh', ''], ['QuocTich', ''], ['SoCCCD', ''], ['DiaChi', ''], ['Email', ''], ['NgayGiaNhapCLB', ''], ['LoaiNhanSu', '']],
    fks: [],
  },
  {
    table: 'NhanSu_SoDienThoai', label: 'Nhân sự – SĐT', domain: '11', rows: 65,
    cols: [['MaNhanSu', 'PK,FK'], ['SoDienThoai', 'PK']],
    fks: [['MaNhanSu', 'NhanSu']],
  },
  {
    table: 'CauThu', label: 'Cầu thủ', domain: '15', rows: 33,
    cols: [['CT_MaNhanSu', 'PK,FK'], ['SoAo', ''], ['ViTri', ''], ['ChanThuan', ''], ['ChieuCao', ''], ['CanNang', ''], ['TrangThai', '']],
    fks: [['CT_MaNhanSu', 'NhanSu']],
  },
  {
    table: 'HuanLuyenVien', label: 'Huấn luyện viên', domain: '13', rows: 8,
    cols: [['HLV_MaNhanSu', 'PK,FK'], ['ChucDanh', ''], ['HangBangHuanLuyen', ''], ['ChuyenMon', '']],
    fks: [['HLV_MaNhanSu', 'NhanSu']],
  },
  {
    table: 'NhanVienVanPhong', label: 'Nhân viên VP', domain: '14', rows: 13,
    cols: [['NVVP_MaNhanSu', 'PK,FK'], ['BoPhan', ''], ['ChucVu', '']],
    fks: [['NVVP_MaNhanSu', 'NhanSu']],
  },
  {
    table: 'HopDongLaoDong', label: 'Hợp đồng lao động', domain: '12', rows: 60,
    cols: [['MaHopDong', 'PK'], ['MaNhanSu', 'FK'], ['LoaiHopDong', ''], ['NgayKy', ''], ['NgayBatDau', ''], ['NgayKetThuc', ''], ['LuongThang', ''], ['PhiGiaiPhong', ''], ['TrangThai', '']],
    fks: [['MaNhanSu', 'NhanSu']],
  },
  {
    table: 'TaiKhoan', label: 'Tài khoản', domain: '1', rows: 13,
    cols: [['MaTaiKhoan', 'PK'], ['MaNhanSu', 'FK'], ['TenDangNhap', ''], ['MatKhau', ''], ['Email', ''], ['HoTenHienThi', ''], ['VaiTro', ''], ['TrangThai', ''], ['NgayTao', '']],
    fks: [['MaNhanSu', 'NhanSu']],
  },
  {
    table: 'TaiKhoan_SoDienThoai', label: 'Tài khoản – SĐT', domain: '2', rows: 13,
    cols: [['MaTaiKhoan', 'PK,FK'], ['SoDienThoai', 'PK']],
    fks: [['MaTaiKhoan', 'TaiKhoan']],
  },
  {
    table: 'TranDau', label: 'Trận đấu', domain: '6a', rows: 39,
    cols: [['MaTran', 'PK'], ['MaGiaiDau', 'FK'], ['MaCLB', 'FK'], ['VongDau', ''], ['ThoiGianThiDau', ''], ['TenSanVanDong', 'FK'], ['SoBanThang', ''], ['SoBanThua', ''], ['GiaVe', ''], ['TrangThai', '']],
    fks: [['MaGiaiDau', 'GiaiDau'], ['MaCLB', 'CauLacBo'], ['TenSanVanDong', 'SanVanDong']],
  },
  {
    table: 'TinTuc', label: 'Tin tức', domain: '3', rows: 9,
    cols: [['MaBaiViet', 'PK'], ['MaTaiKhoan', 'FK'], ['MaTran', 'FK'], ['TieuDe', ''], ['TomTat', ''], ['NoiDung', ''], ['ChuyenMuc', ''], ['NgayTao', ''], ['NgayXuatBan', ''], ['TrangThai', ''], ['LuotXem', '']],
    fks: [['MaTaiKhoan', 'TaiKhoan'], ['MaTran', 'TranDau']],
  },
  {
    table: 'Ve', label: 'Vé', domain: '4', rows: 21,
    cols: [['MaVe', 'PK'], ['MaTaiKhoan', 'FK'], ['MaTran', 'FK'], ['MaKhanDai', 'FK'], ['SoVe', ''], ['KenhBan', ''], ['ThoiDiemMua', ''], ['GiaBan', ''], ['PhuongThucThanhToan', ''], ['TrangThai', '']],
    fks: [['MaTaiKhoan', 'TaiKhoan'], ['MaTran', 'TranDau'], ['MaKhanDai', 'KhanDai']],
  },
  {
    table: 'DoiHinhThiDau', label: 'Đội hình thi đấu', domain: '9', rows: 645,
    cols: [['MaTran', 'PK,FK'], ['CT_MaNhanSu', 'PK,FK'], ['VaiTro', ''], ['ViTriThiDau', ''], ['CapBac', ''], ['DiemDanhGia', '']],
    fks: [['MaTran', 'TranDau'], ['CT_MaNhanSu', 'CauThu']],
  },
  {
    table: 'SuKienTranDau', label: 'Sự kiện trận đấu', domain: '8', rows: 493,
    cols: [['MaSuKien', 'PK'], ['MaTran', 'FK'], ['CT_MaNhanSu', 'FK'], ['MaSuKienLienQuan', 'FK'], ['Phut', ''], ['LoaiSuKien', ''], ['GhiChu', '']],
    fks: [['MaTran', 'TranDau'], ['CT_MaNhanSu', 'CauThu'], ['MaSuKienLienQuan', 'SuKienTranDau']],
  },
  {
    table: 'ChanThuong', label: 'Chấn thương', domain: '16', rows: 5,
    cols: [['MaChanThuong', 'PK'], ['CT_MaNhanSu', 'FK'], ['MaTran', 'FK'], ['LoaiChanThuong', ''], ['ViTriTrenCoThe', ''], ['MucDo', ''], ['NgayChanThuong', ''], ['NgayDuKienTroLai', ''], ['NgayTroLaiThucTe', '']],
    fks: [['CT_MaNhanSu', 'CauThu'], ['MaTran', 'TranDau']],
  },
  {
    table: 'PhienChuyenNhuong', label: 'Phiên chuyển nhượng', domain: '17', rows: 18,
    cols: [['MaChuyenNhuong', 'PK'], ['CT_MaNhanSu', 'FK'], ['MaCLB', 'FK'], ['LoaiChuyenNhuong', ''], ['NgayThucHien', ''], ['PhiChuyenNhuong', ''], ['TrangThai', '']],
    fks: [['CT_MaNhanSu', 'CauThu'], ['MaCLB', 'CauLacBo']],
  },
]

export default function Schema() {
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase()
    if (!q) return SCHEMA
    return SCHEMA.filter(
      (t) =>
        t.table.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.cols.some((c) => c[0].toLowerCase().includes(q))
    )
  }, [term])

  const totalRows = SCHEMA.reduce((a, t) => a + t.rows, 0)
  const totalCols = SCHEMA.reduce((a, t) => a + t.cols.length, 0)
  const totalFks = SCHEMA.reduce((a, t) => a + t.fks.length, 0)

  const fkTargets = useMemo(() => {
    if (!selected) return []
    const s = SCHEMA.find((t) => t.table === selected)
    return s ? s.fks.map(([from, to]) => ({ from, to })) : []
  }, [selected])

  return (
    <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
      <section className="pt-12 pb-8 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          Phần I–V · Lược đồ quan hệ
        </p>
        <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold leading-[1] tracking-[-0.03em] text-[var(--color-ink)]">
          21 bảng, một cây quyền lực.
        </h1>
        <p className="mt-5 max-w-[62ch] text-pretty text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          Lược đồ chuẩn 3NF sau khi phân rã: <span className="font-medium text-[var(--color-ink)]">TranDau</span> tách
          SanVanDong, <span className="font-medium text-[var(--color-ink)]">CauLacBo</span> tách ThanhPho.
          Mọi bảng đều có khoá chính rõ ràng, khoá ngoại được đặt tên và ràng buộc CHECK kiểm tra nghiệp vụ.
        </p>

        <div className="mt-8 flex flex-wrap gap-8">
          {[
            { label: 'Quan hệ', value: SCHEMA.length },
            { label: 'Thuộc tính', value: totalCols },
            { label: 'Khoá ngoại', value: totalFks },
            { label: 'Bản ghi', value: totalRows },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-[var(--color-ink)]">
                {s.value.toLocaleString('vi-VN')}
              </p>
              <p className="mt-0.5 text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <div className="relative mb-6 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] pointer-events-none"
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tìm bảng hoặc cột…"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] py-2 pl-9 pr-3 text-sm placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-grenat)] focus:outline-none transition-colors"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const isSel = selected === t.table
            return (
              <article
                key={t.table}
                onClick={() => setSelected(isSel ? null : t.table)}
                className={`group cursor-pointer rounded-[var(--radius-md)] border bg-[var(--color-paper-pure)] p-5 transition-all ${
                  isSel
                    ? 'border-[var(--color-grenat)] shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-grenat)_14%,transparent)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-grenat-soft)]'
                }`}
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[15px] font-bold leading-tight text-[var(--color-ink)]">
                      {t.label}
                    </h3>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-ink-faint)]">
                      {t.table}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[var(--color-grenat-mist)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--color-grenat-deep)]">
                    {t.domain}
                  </span>
                </header>

                <ul className="mt-4 space-y-0.5">
                  {t.cols.map(([name, key]) => (
                    <li
                      key={name}
                      className="flex items-center gap-2 rounded-[var(--radius-xs)] px-1 py-1 text-[12px] transition-colors group-hover:bg-[var(--color-grenat-mist)]"
                    >
                      <span className="truncate font-mono text-[11px] text-[var(--color-ink-soft)]">
                        {name}
                      </span>
                      {key && (
                        <span
                          className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                            key.includes('FK')
                              ? 'bg-[var(--color-garnet-soft)] text-[var(--color-garnet-deep)]'
                              : 'bg-[var(--color-grenat)] text-[var(--color-paper-pure)]'
                          }`}
                        >
                          {key.includes('FK') ? 'FK' : 'PK'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <footer className="mt-4 flex items-center justify-between border-t border-[var(--color-line-soft)] pt-3 text-[11px] text-[var(--color-ink-faint)]">
                  <span className="tabular-nums">{t.rows} bản ghi</span>
                  {t.fks.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Link2 size={11} />
                      {t.fks.length} khoá ngoại
                    </span>
                  )}
                </footer>
              </article>
            )
          })}
        </div>

        {/* Bảng khoá ngoại */}
        {selected && (
          <div className="fade-in mt-10 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-paper-pure)] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">
                  Khoá ngoại của{' '}
                  <span className="font-mono text-[var(--color-grenat)]">{selected}</span>
                </h3>
                <p className="mt-1 text-sm text-[var(--color-ink-faint)]">
                  {fkTargets.length} liên kết được khai báo
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="grid h-8 w8 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-faint)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {fkTargets.length ? (
              <ul className="mt-6 space-y-2">
                {fkTargets.map((f) => (
                  <li
                    key={f.from}
                    className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line-soft)] px-4 py-3"
                  >
                    <span className="rounded-md bg-[var(--color-garnet-soft)] px-2 py-1 font-mono text-[11px] font-bold text-[var(--color-garnet-deep)]">
                      {f.from}
                    </span>
                    <span className="text-[var(--color-ink-faint)]">→</span>
                    <span className="rounded-md bg-[var(--color-grenat-mist)] px-2 py-1 font-mono text-[11px] font-bold text-[var(--color-grenat-deep)]">
                      {f.to}
                    </span>
                    <span className="text-sm text-[var(--color-ink-soft)]">
                      {SCHEMA.find((t) => t.table === f.to)?.label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-[var(--color-ink-faint)]">
                Bảng này không có khoá ngoại — nó là thực thể gốc của một nhánh quan hệ.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
