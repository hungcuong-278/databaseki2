import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSql } from '../src/sql/engine.js'
import { QUERIES, NGAY_HIEN_TAI } from '../src/data/queries.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/db.json'), 'utf8'))

// Số dòng kỳ vọng ghi trong "Phần VI. Các truy vấn dữ liệu"
const EXPECTED = {
  1: 23, 2: 13, 3: 5, 4: 12, 5: 44, 6: 11, 7: 14, 8: 9, 9: 12, 10: 16,
  11: 75, 12: 45, 13: 29, 14: 53, 15: 5, 16: 5, 17: 23, 18: 1, 19: 3,
  20: 22, 21: 5, 22: 3, 23: 9, 24: 13,
}

let bad = 0
for (const q of QUERIES) {
  const res = runSql(db, q.sql, { '@NgayHienTai': NGAY_HIEN_TAI })
  const exp = EXPECTED[q.id]
  const ok = res.rows.length === exp
  if (!ok) bad++
  console.log(`${ok ? '✓' : '✗'} Q${String(q.id).padStart(2, '0')} ${q.title}: ${res.rows.length}/${exp} dòng`)
}
console.log(bad ? `\n${bad} truy vấn KHÔNG khớp.` : '\n✓ 24/24 truy vấn khớp số dòng kỳ vọng trong tài liệu.')
