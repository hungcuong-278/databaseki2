/**
 * 24 truy vấn & báo cáo từ "Phần VI. Các truy vấn dữ liệu".
 * Mỗi truy vấn có SQL gốc (chạy được trên MySQL) và câu truy vấn tương đương
 * cho engine nội bộ khi SQL gốc dùng thuộc tính đã tách chuẩn hoá.
 */
export const NGAY_HIEN_TAI = '2025-10-04'

export const QUERIES = [
  {
    id: 1,
    title: 'Cầu thủ đang thi đấu',
    group: 'Đội hình',
    icon: 'shirt',
    purpose:
      'Phục vụ yêu cầu tra cứu cầu thủ theo số áo, vị trí, trạng thái. Kết nối bảng Cầu thủ với bảng Nhân sự để lấy thông tin cá nhân; tuổi tính bằng TIMESTAMPDIFF tại ngày hiện tại của dữ liệu.',
    sql: `SELECT c.SoAo, n.HoTen, c.ViTri, n.QuocTich,
       TIMESTAMPDIFF(YEAR, n.NgaySinh, @NgayHienTai) AS Tuoi,
       c.ChieuCao, c.CanNang, c.ChanThuan
FROM CauThu c
JOIN NhanSu n ON n.MaNhanSu = c.CT_MaNhanSu
WHERE c.TrangThai = 'Đang thi đấu'
ORDER BY FIELD(c.ViTri, 'Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'), c.SoAo;`,
    format: {
      Tuoi: 'int',
      ChieuCao: (v) => `${v} cm`,
      CanNang: (v) => `${v} kg`,
    },
    badges: { TrangThai: 'ok' },
  },
  {
    id: 2,
    title: 'Cầu thủ ngoại binh có hợp đồng hiệu lực',
    group: 'Đội hình',
    icon: 'globe',
    purpose:
      'Phục vụ yêu cầu danh sách cầu thủ ngoại binh. Kết nối Nhân sự – Cầu thủ – Hợp đồng lao động, lọc quốc tịch khác Tây Ban Nha và hợp đồng ở trạng thái Hiệu lực.',
    sql: `SELECT n.MaNhanSu, n.HoTen, n.QuocTich, c.ViTri, c.TrangThai,
       h.MaHopDong, h.NgayKetThuc
FROM NhanSu n
JOIN CauThu c          ON c.CT_MaNhanSu = n.MaNhanSu
JOIN HopDongLaoDong h  ON h.MaNhanSu = n.MaNhanSu AND h.TrangThai = 'Hiệu lực'
WHERE n.QuocTich <> 'Tây Ban Nha'
ORDER BY n.QuocTich, n.HoTen;`,
    badges: { TrangThai: 'ok' },
  },
  {
    id: 3,
    title: 'Ban huấn luyện hiện tại',
    group: 'Đội hình',
    icon: 'whistle',
    purpose:
      'Phục vụ yêu cầu danh sách ban huấn luyện hiện tại. Chỉ lấy HLV có hợp đồng hiệu lực bao trùm ngày hiện tại; HLV trưởng được đưa lên đầu.',
    sql: `SELECT l.ChucDanh, n.HoTen, n.QuocTich, l.HangBangHuanLuyen, l.ChuyenMon,
       h.NgayBatDau, h.NgayKetThuc, h.LuongThang
FROM HuanLuyenVien l
JOIN NhanSu n         ON n.MaNhanSu = l.HLV_MaNhanSu
JOIN HopDongLaoDong h ON h.MaNhanSu = l.HLV_MaNhanSu
WHERE h.TrangThai = 'Hiệu lực'
  AND @NgayHienTai BETWEEN h.NgayBatDau AND h.NgayKetThuc
ORDER BY (l.ChucDanh = 'HLV trưởng') DESC, l.ChucDanh, n.HoTen;`,
    format: { LuongThang: 'vnd' },
    highlight: { ChucDanh: 'HLV trưởng' },
  },
  {
    id: 4,
    title: 'Nhân sự có từ 2 hợp đồng trở lên',
    group: 'Nhân sự',
    icon: 'file-stack',
    purpose:
      'Phục vụ yêu cầu tra cứu lịch sử hợp đồng. Truy vấn con với GROUP BY … HAVING COUNT(*) >= 2 tìm nhân sự có nhiều hợp đồng, truy vấn ngoài liệt kê toàn bộ hợp đồng của họ.',
    sql: `SELECT n.MaNhanSu, n.HoTen, n.LoaiNhanSu, h.MaHopDong, h.LoaiHopDong,
       h.NgayKy, h.NgayBatDau, h.NgayKetThuc, h.LuongThang, h.TrangThai
FROM HopDongLaoDong h
JOIN NhanSu n ON n.MaNhanSu = h.MaNhanSu
WHERE h.MaNhanSu IN (SELECT MaNhanSu
                     FROM HopDongLaoDong
                     GROUP BY MaNhanSu
                     HAVING COUNT(*) >= 2)
ORDER BY n.MaNhanSu, h.NgayBatDau;`,
    format: { LuongThang: 'vnd' },
    badges: { TrangThai: 'neutral' },
  },
  {
    id: 5,
    title: 'Hợp đồng sắp hết hạn trong 12 tháng',
    group: 'Nhân sự',
    icon: 'alarm',
    purpose:
      'Phục vụ ứng dụng cảnh báo hợp đồng sắp hết hạn. Lọc hợp đồng Hiệu lực có Ngày kết thúc trong khoảng 12 tháng tới và tính số ngày còn lại.',
    sql: `SELECT h.MaHopDong, n.HoTen,
       CASE n.LoaiNhanSu WHEN 'CT' THEN 'Cầu thủ'
                         WHEN 'HLV' THEN 'Huấn luyện viên'
                         ELSE 'Nhân viên văn phòng' END AS LoaiNhanSu,
       h.LoaiHopDong, h.NgayKetThuc,
       DATEDIFF(h.NgayKetThuc, @NgayHienTai) AS SoNgayConLai
FROM HopDongLaoDong h
JOIN NhanSu n ON n.MaNhanSu = h.MaNhanSu
WHERE h.TrangThai = 'Hiệu lực'
  AND h.NgayKetThuc BETWEEN @NgayHienTai AND DATE_ADD(@NgayHienTai, INTERVAL 12 MONTH)
ORDER BY h.NgayKetThuc, n.LoaiNhanSu, n.HoTen;`,
    format: { SoNgayConLai: 'days' },
    badges: { LoaiNhanSu: 'info' },
  },
  {
    id: 6,
    title: 'Nhân sự có nhiều số điện thoại',
    group: 'Nhân sự',
    icon: 'phone',
    purpose:
      'Khai thác bảng thuộc tính đa trị Nhân sự – Số điện thoại: gom nhóm theo nhân sự, giữ lại nhóm có hơn một số và ghép danh sách số bằng GROUP_CONCAT.',
    sql: `SELECT n.MaNhanSu, n.HoTen, COUNT(*) AS SoLuongSDT,
       GROUP_CONCAT(s.SoDienThoai ORDER BY s.SoDienThoai SEPARATOR ', ') AS DanhSachSDT
FROM NhanSu n
JOIN NhanSu_SoDienThoai s ON s.MaNhanSu = n.MaNhanSu
GROUP BY n.MaNhanSu, n.HoTen
HAVING COUNT(*) > 1
ORDER BY n.MaNhanSu;`,
    format: { SoLuongSDT: 'int' },
  },
  {
    id: 7,
    title: 'Kết quả các trận đã đấu mùa 2024/2025',
    group: 'Thi đấu',
    icon: 'whistle',
    purpose:
      'Phục vụ yêu cầu xem kết quả các trận đã đấu theo giải/mùa. Biểu thức CASE quy đổi tỉ số thành Thắng / Hoà / Thua.',
    sql: `SELECT t.ThoiGianThiDau, g.TenGiai, t.VongDau, c.TenCLB AS DoiThu, s.DiaDiem,
       CONCAT(t.SoBanThang, ' - ', t.SoBanThua) AS TiSo,
       CASE WHEN t.SoBanThang > t.SoBanThua THEN 'Thắng'
            WHEN t.SoBanThang = t.SoBanThua THEN 'Hoà'
            ELSE 'Thua' END AS KetQua
FROM TranDau t
JOIN GiaiDau g  ON g.MaGiaiDau = t.MaGiaiDau
JOIN CauLacBo c ON c.MaCLB = t.MaCLB
JOIN SanVanDong s ON s.TenSanVanDong = t.TenSanVanDong
WHERE t.TrangThai = 'Đã kết thúc'
  AND g.MuaGiai = '2024/2025'
ORDER BY t.ThoiGianThiDau;`,
    badges: { KetQua: 'result', DiaDiem: 'info' },
  },
  {
    id: 8,
    title: 'Thành tích CLB theo từng giải đấu',
    group: 'Thống kê',
    icon: 'chart',
    chart: 'bar',
    purpose:
      'Phục vụ báo cáo thành tích theo giải: số trận thắng – hoà – thua, bàn thắng – bàn thua, hiệu số. Dùng SUM trên biểu thức so sánh để đếm theo điều kiện trong cùng một lần gom nhóm.',
    sql: `SELECT g.TenGiai, g.MuaGiai,
       COUNT(*)                              AS SoTran,
       SUM(t.SoBanThang > t.SoBanThua)       AS Thang,
       SUM(t.SoBanThang = t.SoBanThua)       AS Hoa,
       SUM(t.SoBanThang < t.SoBanThua)       AS Thua,
       SUM(t.SoBanThang)                     AS BanThang,
       SUM(t.SoBanThua)                      AS BanThua,
       SUM(t.SoBanThang) - SUM(t.SoBanThua)  AS HieuSo
FROM TranDau t
JOIN GiaiDau g ON g.MaGiaiDau = t.MaGiaiDau
WHERE t.TrangThai = 'Đã kết thúc'
GROUP BY g.MaGiaiDau, g.TenGiai, g.MuaGiai
ORDER BY g.MuaGiai, g.TenGiai;`,
    format: { HieuSo: 'int' },
    stackedChart: { keys: ['Thang', 'Hoa', 'Thua'], label: 'Kết quả' },
  },
  {
    id: 9,
    title: 'Thành tích đối đầu với từng đối thủ',
    group: 'Thống kê',
    icon: 'chart',
    chart: 'bar',
    purpose:
      'Phục vụ báo cáo thành tích đối đầu. Gom nhóm các trận đã kết thúc theo CLB đối thủ và tính số trận thắng – hoà – thua cùng tổng tỉ số.',
    sql: `SELECT c.TenCLB AS DoiThu, p.QuocGia,
       COUNT(*)                        AS SoTran,
       SUM(t.SoBanThang > t.SoBanThua) AS Thang,
       SUM(t.SoBanThang = t.SoBanThua) AS Hoa,
       SUM(t.SoBanThang < t.SoBanThua) AS Thua,
       CONCAT(SUM(t.SoBanThang), ' - ', SUM(t.SoBanThua)) AS TongTiSo
FROM TranDau t
JOIN CauLacBo c ON c.MaCLB = t.MaCLB
JOIN ThanhPho p ON p.ThanhPho = c.ThanhPho
WHERE t.TrangThai = 'Đã kết thúc'
GROUP BY c.MaCLB, c.TenCLB, p.QuocGia
ORDER BY SoTran DESC, Thang DESC;`,
    stackedChart: { keys: ['Thang', 'Hoa', 'Thua'], label: 'Kết quả' },
    badges: { QuocGia: 'info' },
  },
  {
    id: 10,
    title: 'Diễn biến trận đấu',
    group: 'Thi đấu',
    icon: 'activity',
    timeline: true,
    purpose:
      'Phục vụ yêu cầu xem diễn biến một trận. Phép tự kết nối bảng Sự kiện trận đấu qua Mã sự kiện liên quan cho biết kiến tạo cho ai, vào sân thay ai và thẻ đỏ là trực tiếp hay gián tiếp.',
    sql: `SELECT s.Phut, s.LoaiSuKien, n.HoTen AS CauThu,
       CASE s.LoaiSuKien
            WHEN 'Kiến tạo' THEN CONCAT('Kiến tạo cho ', nl.HoTen)
            WHEN 'Vào sân'  THEN CONCAT('Vào thay ', nl.HoTen)
            WHEN 'Thẻ đỏ'   THEN IF(lq.MaSuKien IS NULL, 'Thẻ đỏ trực tiếp', 'Thẻ vàng thứ hai')
            ELSE s.GhiChu END AS ChiTiet
FROM SuKienTranDau s
JOIN NhanSu n             ON n.MaNhanSu = s.CT_MaNhanSu
LEFT JOIN SuKienTranDau lq ON lq.MaSuKien = s.MaSuKienLienQuan
LEFT JOIN NhanSu nl       ON nl.MaNhanSu = lq.CT_MaNhanSu
WHERE s.MaTran = 'TD002'
ORDER BY s.Phut, s.MaSuKien;`,
    badges: { LoaiSuKien: 'event' },
  },
  {
    id: 11,
    title: 'Bàn thắng kèm cầu thủ kiến tạo',
    group: 'Thi đấu',
    icon: 'target',
    purpose:
      'Tự kết nối bàn thắng với sự kiện Kiến tạo tham chiếu tới nó. Dùng LEFT JOIN để giữ cả các bàn thắng không có kiến tạo (phạt đền, đá phạt trực tiếp…).',
    sql: `SELECT t.MaTran, t.ThoiGianThiDau, c.TenCLB AS DoiThu, g.Phut,
       ng.HoTen AS NguoiGhiBan, g.GhiChu AS CachGhiBan,
       COALESCE(na.HoTen, '(không có kiến tạo)') AS NguoiKienTao
FROM SuKienTranDau g
JOIN TranDau t            ON t.MaTran = g.MaTran
JOIN CauLacBo c           ON c.MaCLB = t.MaCLB
JOIN NhanSu ng            ON ng.MaNhanSu = g.CT_MaNhanSu
LEFT JOIN SuKienTranDau a ON a.MaSuKienLienQuan = g.MaSuKien AND a.LoaiSuKien = 'Kiến tạo'
LEFT JOIN NhanSu na       ON na.MaNhanSu = a.CT_MaNhanSu
WHERE g.LoaiSuKien = 'Bàn thắng'
ORDER BY t.ThoiGianThiDau, g.Phut;`,
    format: { Phut: (v) => `${v}'` },
    badges: { CachGhiBan: 'info' },
  },
  {
    id: 12,
    title: 'Bảng xếp hạng ghi bàn, kiến tạo',
    group: 'Thống kê',
    icon: 'chart',
    chart: 'bar',
    purpose:
      'Phục vụ báo cáo bảng xếp hạng ghi bàn, kiến tạo theo mùa. Gom nhóm sự kiện theo mùa giải và cầu thủ, đếm bàn thắng, kiến tạo và tổng đóng góp.',
    sql: `SELECT g.MuaGiai, n.HoTen, c.ViTri,
       SUM(s.LoaiSuKien = 'Bàn thắng') AS BanThang,
       SUM(s.LoaiSuKien = 'Kiến tạo')  AS KienTao,
       SUM(s.LoaiSuKien IN ('Bàn thắng', 'Kiến tạo')) AS DongGopBanThang
FROM SuKienTranDau s
JOIN TranDau t ON t.MaTran = s.MaTran
JOIN GiaiDau g ON g.MaGiaiDau = t.MaGiaiDau
JOIN NhanSu n  ON n.MaNhanSu = s.CT_MaNhanSu
JOIN CauThu c  ON c.CT_MaNhanSu = s.CT_MaNhanSu
WHERE s.LoaiSuKien IN ('Bàn thắng', 'Kiến tạo')
GROUP BY g.MuaGiai, n.MaNhanSu, n.HoTen, c.ViTri
ORDER BY g.MuaGiai, BanThang DESC, KienTao DESC;`,
    stackedChart: { keys: ['BanThang', 'KienTao'], label: 'Đóng góp' },
  },
  {
    id: 13,
    title: 'Số phút thi đấu của từng cầu thủ',
    group: 'Thống kê',
    icon: 'clock',
    chart: 'bar',
    purpose:
      'Số phút thi đấu không được lưu (tránh thuộc tính dẫn xuất) mà được tính bằng biểu thức bảng chung (CTE): phút vào sân là 0 với cầu thủ đá chính hoặc phút của sự kiện Vào sân; phút rời sân là phút Rời sân / Thẻ đỏ đầu tiên, nếu không có thì là 90.',
    sql: `WITH SoPhut AS (
    SELECT d.MaTran, d.CT_MaNhanSu, d.VaiTro,
           CASE WHEN d.VaiTro = 'Đá chính' THEN 0 ELSE vs.Phut END AS PhutVao,
           COALESCE(rs.PhutRa, 90) AS PhutRa
    FROM DoiHinhThiDau d
    LEFT JOIN SuKienTranDau vs
           ON vs.MaTran = d.MaTran AND vs.CT_MaNhanSu = d.CT_MaNhanSu
          AND vs.LoaiSuKien = 'Vào sân'
    LEFT JOIN (SELECT MaTran, CT_MaNhanSu, MIN(Phut) AS PhutRa
               FROM SuKienTranDau
               WHERE LoaiSuKien IN ('Rời sân', 'Thẻ đỏ')
               GROUP BY MaTran, CT_MaNhanSu) rs
           ON rs.MaTran = d.MaTran AND rs.CT_MaNhanSu = d.CT_MaNhanSu
    WHERE d.VaiTro = 'Đá chính' OR vs.MaSuKien IS NOT NULL
)
SELECT n.HoTen, c.ViTri,
       COUNT(*)                     AS SoTranRaSan,
       SUM(p.VaiTro = 'Đá chính')   AS SoTranDaChinh,
       SUM(p.PhutRa - p.PhutVao)    AS TongSoPhut,
       ROUND(AVG(p.PhutRa - p.PhutVao), 1) AS SoPhutTrungBinh
FROM SoPhut p
JOIN NhanSu n ON n.MaNhanSu = p.CT_MaNhanSu
JOIN CauThu c ON c.CT_MaNhanSu = p.CT_MaNhanSu
GROUP BY n.MaNhanSu, n.HoTen, c.ViTri
ORDER BY TongSoPhut DESC;`,
    format: { TongSoPhut: (v) => `${v.toLocaleString('vi-VN')} phút`, SoPhutTrungBinh: (v) => `${v} phút` },
    stackedChart: { keys: ['SoTranDaChinh', 'SoTranRaSan'], label: 'Trận' },
  },
  {
    id: 14,
    title: 'Thống kê thẻ phạt theo giải đấu',
    group: 'Thống kê',
    icon: 'card',
    purpose:
      'Phục vụ báo cáo kỷ luật. Đếm thẻ vàng, thẻ đỏ của từng cầu thủ trong từng giải; đây cũng là dữ liệu đầu vào để kiểm tra ngưỡng 5 thẻ vàng treo giò.',
    sql: `SELECT g.TenGiai, g.MuaGiai, n.HoTen,
       SUM(s.LoaiSuKien = 'Thẻ vàng') AS TheVang,
       SUM(s.LoaiSuKien = 'Thẻ đỏ')   AS TheDo
FROM SuKienTranDau s
JOIN TranDau t ON t.MaTran = s.MaTran
JOIN GiaiDau g ON g.MaGiaiDau = t.MaGiaiDau
JOIN NhanSu n  ON n.MaNhanSu = s.CT_MaNhanSu
WHERE s.LoaiSuKien IN ('Thẻ vàng', 'Thẻ đỏ')
GROUP BY g.MaGiaiDau, g.TenGiai, g.MuaGiai, n.MaNhanSu, n.HoTen
ORDER BY TheDo DESC, TheVang DESC, g.MuaGiai;`,
    badges: { TheVang: 'warn', TheDo: 'danger' },
  },
  {
    id: 15,
    title: 'Cầu thủ bị treo giò do thẻ đỏ',
    group: 'Thống kê',
    icon: 'ban',
    purpose:
      'Phục vụ ứng dụng tính án treo giò. Hàm cửa sổ LEAD() trên lịch thi đấu của từng giải cho biết trận kế tiếp của cùng giải mà cầu thủ nhận thẻ đỏ phải nghỉ.',
    sql: `WITH LichGiai AS (
    SELECT MaTran, MaGiaiDau, ThoiGianThiDau,
           LEAD(MaTran) OVER (PARTITION BY MaGiaiDau ORDER BY ThoiGianThiDau) AS TranKeTiep
    FROM TranDau
)
SELECT n.HoTen, g.TenGiai, g.MuaGiai, s.MaTran AS TranNhanTheDo, s.Phut,
       IF(s.MaSuKienLienQuan IS NULL, 'Thẻ đỏ trực tiếp', 'Thẻ đỏ gián tiếp') AS LoaiThe,
       COALESCE(l.TranKeTiep, '(giải đã hết trận)') AS TranBiTreoGio,
       tk.ThoiGianThiDau AS NgayTranTreoGio
FROM SuKienTranDau s
JOIN LichGiai l      ON l.MaTran = s.MaTran
JOIN GiaiDau g       ON g.MaGiaiDau = l.MaGiaiDau
JOIN NhanSu n        ON n.MaNhanSu = s.CT_MaNhanSu
LEFT JOIN TranDau tk ON tk.MaTran = l.TranKeTiep
WHERE s.LoaiSuKien = 'Thẻ đỏ'
ORDER BY l.ThoiGianThiDau;`,
    badges: { LoaiThe: 'danger' },
  },
  {
    id: 16,
    title: 'Top 5 cầu thủ có điểm đánh giá cao nhất',
    group: 'Đội hình',
    icon: 'star',
    chart: 'bar',
    purpose:
      'Tính điểm đánh giá trung bình của các cầu thủ có ít nhất 10 trận được chấm điểm (HAVING), bỏ qua giá trị NULL của cầu thủ dự bị không vào sân, lấy 5 người cao nhất bằng LIMIT.',
    sql: `SELECT n.HoTen, c.ViTri,
       COUNT(d.DiemDanhGia)          AS SoTranCoDiem,
       ROUND(AVG(d.DiemDanhGia), 2)  AS DiemTrungBinh,
       MAX(d.DiemDanhGia)            AS DiemCaoNhat
FROM DoiHinhThiDau d
JOIN NhanSu n ON n.MaNhanSu = d.CT_MaNhanSu
JOIN CauThu c ON c.CT_MaNhanSu = d.CT_MaNhanSu
WHERE d.DiemDanhGia IS NOT NULL
GROUP BY n.MaNhanSu, n.HoTen, c.ViTri
HAVING COUNT(d.DiemDanhGia) >= 10
ORDER BY DiemTrungBinh DESC
LIMIT 5;`,
    format: { DiemTrungBinh: (v) => v.toFixed(2), DiemCaoNhat: (v) => v.toFixed(1) },
    chart: { type: 'bar', valueKey: 'DiemTrungBinh', nameKey: 'HoTen' },
  },
  {
    id: 17,
    title: 'Cầu thủ đủ điều kiện ra sân (TD032)',
    group: 'Đội hình',
    icon: 'check',
    purpose:
      'Phục vụ ứng dụng đăng ký đội hình. Áp dụng đồng thời các ràng buộc: có hợp đồng hiệu lực tại ngày thi đấu; không đang cho mượn hay đã rời CLB; không có chấn thương chưa hồi phục; không nhận thẻ đỏ ở trận liền trước của cùng giải.',
    sql: `SELECT c.SoAo, n.HoTen, c.ViTri, n.QuocTich
FROM CauThu c
JOIN NhanSu n  ON n.MaNhanSu = c.CT_MaNhanSu
JOIN TranDau t ON t.MaTran = 'TD032'
WHERE c.TrangThai NOT IN ('Đang cho mượn', 'Đã rời CLB')
  AND EXISTS (SELECT 1 FROM HopDongLaoDong h
              WHERE h.MaNhanSu = c.CT_MaNhanSu
                AND h.TrangThai = 'Hiệu lực'
                AND DATE(t.ThoiGianThiDau) BETWEEN h.NgayBatDau AND h.NgayKetThuc)
  AND NOT EXISTS (SELECT 1 FROM ChanThuong ct
                  WHERE ct.CT_MaNhanSu = c.CT_MaNhanSu
                    AND ct.NgayChanThuong <= DATE(t.ThoiGianThiDau)
                    AND (ct.NgayTroLaiThucTe IS NULL
                         OR ct.NgayTroLaiThucTe > DATE(t.ThoiGianThiDau)))
  AND NOT EXISTS (SELECT 1 FROM SuKienTranDau s
                  WHERE s.CT_MaNhanSu = c.CT_MaNhanSu
                    AND s.LoaiSuKien = 'Thẻ đỏ'
                    AND s.MaTran = (SELECT t2.MaTran FROM TranDau t2
                                    WHERE t2.MaGiaiDau = t.MaGiaiDau
                                      AND t2.ThoiGianThiDau < t.ThoiGianThiDau
                                    ORDER BY t2.ThoiGianThiDau DESC
                                    LIMIT 1))
ORDER BY FIELD(c.ViTri, 'Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'), c.SoAo;`,
  },
  {
    id: 18,
    title: 'Cầu thủ đang chấn thương',
    group: 'Y tế',
    icon: 'bandage',
    purpose:
      'Phục vụ yêu cầu danh sách cầu thủ đang chấn thương. Lọc các chấn thương chưa có Ngày trở lại thực tế, tính số ngày đã nghỉ và số ngày dự kiến còn lại.',
    sql: `SELECT n.HoTen, ct.LoaiChanThuong, ct.ViTriTrenCoThe, ct.MucDo,
       ct.NgayChanThuong, ct.NgayDuKienTroLai,
       DATEDIFF(@NgayHienTai, ct.NgayChanThuong) AS SoNgayDaNghi,
       DATEDIFF(ct.NgayDuKienTroLai, @NgayHienTai) AS SoNgayDuKienConLai
FROM ChanThuong ct
JOIN NhanSu n ON n.MaNhanSu = ct.CT_MaNhanSu
WHERE ct.NgayTroLaiThucTe IS NULL
ORDER BY ct.NgayChanThuong;`,
    format: { SoNgayDaNghi: 'days', SoNgayDuKienConLai: 'days' },
    badges: { MucDo: 'danger' },
  },
  {
    id: 19,
    title: 'Thống kê chấn thương theo mức độ',
    group: 'Y tế',
    icon: 'chart',
    chart: 'bar',
    purpose:
      'Phục vụ báo cáo thống kê chấn thương. Gom nhóm theo mức độ, đếm số ca và tổng số ngày nghỉ; chấn thương chưa hồi phục được tính đến ngày hiện tại nhờ COALESCE.',
    sql: `SELECT ct.MucDo,
       COUNT(*) AS SoCa,
       SUM(DATEDIFF(COALESCE(ct.NgayTroLaiThucTe, @NgayHienTai), ct.NgayChanThuong)) AS TongSoNgayNghi,
       ROUND(AVG(DATEDIFF(COALESCE(ct.NgayTroLaiThucTe, @NgayHienTai), ct.NgayChanThuong)), 1) AS TrungBinhNgayNghi,
       GROUP_CONCAT(n.HoTen ORDER BY ct.NgayChanThuong SEPARATOR ', ') AS CauThu
FROM ChanThuong ct
JOIN NhanSu n ON n.MaNhanSu = ct.CT_MaNhanSu
GROUP BY ct.MucDo
ORDER BY FIELD(ct.MucDo, 'Nặng', 'Trung bình', 'Nhẹ');`,
    format: { TrungBinhNgayNghi: (v) => `${v} ngày`, TongSoNgayNghi: (v) => `${v} ngày` },
    badges: { MucDo: 'danger' },
    chart: { type: 'bar', valueKey: 'TongSoNgayNghi', nameKey: 'MucDo' },
  },
  {
    id: 20,
    title: 'Doanh thu vé theo trận và khán đài',
    group: 'Kinh doanh',
    icon: 'ticket',
    chart: 'bar',
    purpose:
      'Phục vụ báo cáo doanh thu vé theo trận, theo khán đài. GROUP BY … WITH ROLLUP sinh thêm dòng tổng của từng trận và dòng tổng cộng toàn bộ; vé đã huỷ không được tính.',
    sql: `SELECT COALESCE(t.MaTran, 'TỔNG CỘNG') AS MaTran,
       COALESCE(k.TenKhanDai, IF(t.MaTran IS NULL, '', 'Cả trận')) AS KhanDai,
       COUNT(*)      AS SoVe,
       SUM(v.GiaBan) AS DoanhThu
FROM Ve v
JOIN TranDau t ON t.MaTran = v.MaTran
JOIN KhanDai k ON k.MaKhanDai = v.MaKhanDai
WHERE v.TrangThai <> 'Đã huỷ'
GROUP BY t.MaTran, k.TenKhanDai WITH ROLLUP;`,
    format: { DoanhThu: 'vnd' },
    rollup: true,
    chart: { type: 'bar', valueKey: 'DoanhThu', nameKey: 'MaTran' },
  },
  {
    id: 21,
    title: 'Ghế còn trống & tỉ lệ lấp đầy khán đài',
    group: 'Kinh doanh',
    icon: 'armchair',
    purpose:
      'Phục vụ yêu cầu xem số ghế còn trống của khán đài trong một trận. LEFT JOIN từ Khán đài sang Vé để giữ cả khán đài chưa bán vé nào; giá bán hiện tại = Giá vé cơ bản × hệ số giá vé của trận.',
    sql: `SELECT k.TenKhanDai, k.SucChua,
       COUNT(v.MaVe)                      AS SoVeDaBan,
       k.SucChua - COUNT(v.MaVe)          AS SoGheConTrong,
       ROUND(COUNT(v.MaVe) * 100.0 / k.SucChua, 4) AS TiLeLapDay_PhanTram,
       k.GiaVeCoBan * t.GiaVe             AS GiaBanHienTai
FROM KhanDai k
JOIN TranDau t  ON t.MaTran = 'TD032'
LEFT JOIN Ve v  ON v.MaKhanDai = k.MaKhanDai AND v.MaTran = t.MaTran
               AND v.TrangThai <> 'Đã huỷ'
WHERE k.TrangThai = 'Hoạt động'
GROUP BY k.MaKhanDai, k.TenKhanDai, k.SucChua, k.GiaVeCoBan, t.GiaVe
ORDER BY k.TenKhanDai;`,
    format: {
      GiaBanHienTai: 'vnd',
      TiLeLapDay_PhanTram: (v) => `${(v * 100).toFixed(2)}%`,
      SucChua: (v) => v.toLocaleString('vi-VN'),
    },
    progressBar: { value: 'TiLeLapDay_PhanTram', max: 1, label: 'Tỉ lệ lấp đầy' },
  },
  {
    id: 22,
    title: 'Tổng quỹ lương hằng tháng',
    group: 'Kinh doanh',
    icon: 'wallet',
    chart: 'bar',
    purpose:
      'Phục vụ báo cáo quỹ lương. Cộng lương tháng của các hợp đồng hiệu lực tại ngày hiện tại, gom nhóm theo loại nhân sự.',
    sql: `SELECT CASE n.LoaiNhanSu WHEN 'CT' THEN 'Cầu thủ'
                         WHEN 'HLV' THEN 'Huấn luyện viên'
                         ELSE 'Nhân viên văn phòng' END AS LoaiNhanSu,
       COUNT(*)            AS SoNhanSu,
       SUM(h.LuongThang)   AS TongQuyLuongThang,
       ROUND(AVG(h.LuongThang)) AS LuongTrungBinh,
       MAX(h.LuongThang)   AS LuongCaoNhat
FROM HopDongLaoDong h
JOIN NhanSu n ON n.MaNhanSu = h.MaNhanSu
WHERE h.TrangThai = 'Hiệu lực'
  AND @NgayHienTai BETWEEN h.NgayBatDau AND h.NgayKetThuc
GROUP BY n.LoaiNhanSu
ORDER BY TongQuyLuongThang DESC;`,
    format: {
      TongQuyLuongThang: 'vnd',
      LuongTrungBinh: 'vnd',
      LuongCaoNhat: 'vnd',
    },
    chart: { type: 'bar', valueKey: 'TongQuyLuongThang', nameKey: 'LoaiNhanSu' },
  },
  {
    id: 23,
    title: 'Bài viết đã xuất bản theo chuyên mục',
    group: 'Nội dung',
    icon: 'news',
    purpose:
      'Phục vụ yêu cầu danh sách bài đã xuất bản theo chuyên mục. LEFT JOIN với Trận đấu vì Mã trận của bài viết có thể NULL.',
    sql: `SELECT b.ChuyenMuc, b.NgayXuatBan, b.TieuDe, a.HoTenHienThi AS TacGia,
       COALESCE(CONCAT(t.MaTran, ' - ', c.TenCLB), '(không gắn trận)') AS TranLienQuan,
       b.LuotXem
FROM TinTuc b
JOIN TaiKhoan a      ON a.MaTaiKhoan = b.MaTaiKhoan
LEFT JOIN TranDau t  ON t.MaTran = b.MaTran
LEFT JOIN CauLacBo c ON c.MaCLB = t.MaCLB
WHERE b.TrangThai = 'Đã xuất bản'
ORDER BY b.ChuyenMuc, b.NgayXuatBan DESC;`,
    format: { LuotXem: (v) => `${(v / 1000).toFixed(1)}k` },
    badges: { ChuyenMuc: 'info' },
  },
  {
    id: 24,
    title: 'Tài khoản theo vai trò',
    group: 'Nội dung',
    icon: 'users',
    purpose:
      'Phục vụ yêu cầu danh sách tài khoản theo vai trò. LEFT JOIN với Nhân sự và Nhân viên văn phòng (tài khoản người hâm mộ không liên kết nhân sự) và truy vấn con tương quan đếm số vé mỗi tài khoản đã giao dịch.',
    sql: `SELECT a.VaiTro, a.MaTaiKhoan, a.TenDangNhap, a.Email, a.TrangThai,
       COALESCE(n.HoTen, '(người hâm mộ)') AS NhanSuLienKet,
       nv.BoPhan, nv.ChucVu,
       (SELECT COUNT(*) FROM Ve v WHERE v.MaTaiKhoan = a.MaTaiKhoan) AS SoVeDaGiaoDich
FROM TaiKhoan a
LEFT JOIN NhanSu n            ON n.MaNhanSu = a.MaNhanSu
LEFT JOIN NhanVienVanPhong nv ON nv.NVVP_MaNhanSu = a.MaNhanSu
ORDER BY FIELD(a.VaiTro, 'Quản trị viên', 'Biên tập viên', 'Nhân viên bán vé', 'Người hâm mộ'),
         a.MaTaiKhoan;`,
    format: { SoVeDaGiaoDich: 'int' },
    badges: { VaiTro: 'accent', TrangThai: 'ok' },
  },
]
