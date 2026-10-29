/* ============================================================================
 * Tiện ích định dạng & dữ liệu dùng chung
 * ==========================================================================*/

export const fmtVND = (v) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

export const fmtNum = (v) =>
  v === null || v === undefined ? '—' : new Intl.NumberFormat('vi-VN').format(v)

export const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(v)
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export const fmtDateTime = (v) => {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(v)
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

/** Rút gọn tên cột SQL thành nhãn tiếng Việt dễ đọc */
export function humanizeColumn(name) {
  if (!name) return ''
  const clean = name.includes('.') ? name.split('.').pop() : name
  return clean.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Nhận diện cột nào chứa số để căn phải + dùng font mono */
export function isNumericColumn(rows, col) {
  let seen = 0
  let numeric = 0
  for (const r of rows) {
    const v = r[col]
    if (v === null || v === undefined) continue
    seen++
    if (typeof v === 'number') numeric++
  }
  return seen > 0 && numeric / seen > 0.8
}

/** Bảng màu trạng thái — ánh xạ giá trị tiếng Việt sang màu chip */
const STATUS_TONE = {
  'Đã kết thúc': 'ok',
  'Sắp diễn ra': 'info',
  'Đang diễn ra': 'warn',
  Hoãn: 'warn',
  Huỷ: 'danger',
  'Đang thi đấu': 'ok',
  'Đang cho mượn': 'warn',
  'Chấn thương': 'danger',
  'Đã rời CLB': 'muted',
  'Hiệu lực': 'ok',
  'Hết hạn': 'warn',
  'Chấm dứt trước hạn': 'danger',
  'Đã xuất bản': 'ok',
  Nháp: 'muted',
  'Chờ duyệt': 'warn',
  'Đã ẩn': 'muted',
  'Hoạt động': 'ok',
  'Đang sửa chữa': 'warn',
  'Bị khoá': 'danger',
  'Chưa xác thực': 'warn',
  Thắng: 'ok',
  Hoà: 'muted',
  Thua: 'danger',
  'Bàn thắng': 'ok',
  'Kiến tạo': 'info',
  'Thẻ vàng': 'warn',
  'Thẻ đỏ': 'danger',
  'Vào sân': 'ok',
  'Rời sân': 'muted',
  'Phản lưới nhà': 'danger',
  Nặng: 'danger',
  'Trung bình': 'warn',
  Nhẹ: 'ok',
  'Hoàn tất': 'ok',
  'Đang đàm phán': 'warn',
  'Mua vào': 'info',
  'Bán đi': 'warn',
  'Cho mượn': 'muted',
  'Mượn về': 'info',
  'Tự do': 'muted',
  'Chính thức': 'ok',
  'Thử việc': 'info',
  'Cầu thủ trẻ': 'muted',
  'Quản trị viên': 'accent',
  'Biên tập viên': 'info',
  'Nhân viên bán vé': 'warn',
  'Người hâm mộ': 'muted',
  'Sân nhà': 'ok',
  'Sân khách': 'muted',
  'Sân trung lập': 'info',
}

export const statusTone = (v) => STATUS_TONE[v] || 'neutral'

/* Màu nhóm truy vấn */
export const GROUP_META = {
  'Đội hình': { tint: 'var(--color-grenat)', label: 'Đội hình' },
  'Nhân sự': { tint: 'var(--color-grenat-soft)', label: 'Nhân sự' },
  'Thi đấu': { tint: 'var(--color-garnet)', label: 'Thi đấu' },
  'Thống kê': { tint: 'var(--color-amber-club)', label: 'Thống kê' },
  'Y tế': { tint: 'oklch(0.62 0.14 25)', label: 'Y tế' },
  'Kinh doanh': { tint: 'oklch(0.66 0.13 160)', label: 'Kinh doanh' },
  'Nội dung': { tint: 'oklch(0.58 0.12 300)', label: 'Nội dung' },
}

/* ---------------------- Tô màu cú pháp SQL ---------------------- */
const SQL_KEYWORDS = new RegExp(
  '\\b(SELECT|FROM|WHERE|GROUP|BY|HAVING|ORDER|LIMIT|AS|AND|OR|NOT|IN|EXISTS|NULL|IS|LIKE|CASE|WHEN|THEN|ELSE|END|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|WITH|ASC|DESC|DIV|MOD|INTERVAL|OVER|PARTITION|TRUE|FALSE|ROLLUP|SEPARATOR|BETWEEN|DISTINCT)\\b',
  'gi'
)
const SQL_FUNCS = new RegExp(
  '\\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|COALESCE|IFNULL|NULLIF|ROUND|CEIL|FLOOR|ABS|YEAR|MONTH|DAY|DATE|DATEDIFF|TIMESTAMPDIFF|DATE_ADD|DATE_SUB|NOW|CURDATE|CONCAT|UPPER|LOWER|TRIM|LENGTH|SUBSTRING|GREATEST|LEAST|FIELD|LEAD|LAG|ROW_NUMBER|RANK)\\b',
  'gi'
)

export function highlightSQL(sql) {
  const esc = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Bảo vệ chuỗi trước
  const parts = []
  let last = 0
  const strRe = /'(?:[^']|'')*'/g
  let m
  while ((m = strRe.exec(esc)) !== null) {
    parts.push(esc.slice(last, m.index))
    parts.push(`<span class="str">${m[0]}</span>`)
    last = m.index + m[0].length
  }
  parts.push(esc.slice(last))

  return parts
    .map((chunk) => {
      if (chunk.startsWith('<span class="str">')) return chunk
      return chunk
        .replace(SQL_KEYWORDS, '<span class="kw">$1</span>')
        .replace(SQL_FUNCS, '<span class="fn">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>')
    })
    .join('')
}
