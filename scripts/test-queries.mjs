import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSql } from '../src/sql/engine.js'
import { QUERIES, NGAY_HIEN_TAI } from '../src/data/queries.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/db.json'), 'utf8'))

let fail = 0
for (const q of QUERIES) {
  try {
    const res = runSql(db, q.sql, { '@NgayHienTai': NGAY_HIEN_TAI })
    console.log(`✓ Q${String(q.id).padStart(2, '0')} ${q.title} → ${res.rows.length} dòng | cols: ${res.columns.join(', ')}`)
  } catch (e) {
    fail++
    console.log(`✗ Q${String(q.id).padStart(2, '0')} ${q.title}\n    LỖI: ${e.message}`)
  }
}
console.log(fail ? `\n${fail} truy vấn lỗi.` : '\nTất cả truy vấn chạy thành công.')
