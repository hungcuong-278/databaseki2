/**
 * Trích xuất dữ liệu từ file SQL (QLCLB_Data_21bang_3NF.sql) ra JSON.
 * Dùng: node scripts/parse-sql.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SQL_FILE = fs
  .readdirSync(ROOT)
  .find((f) => f.endsWith('.sql') && f.includes('21bang'))

const sql = fs.readFileSync(path.join(ROOT, SQL_FILE), 'utf8')

/** Tách danh sách giá trị trong một mệnh đề VALUES, tôn trọng dấu nháy. */
function splitValues(str) {
  const rows = []
  let depth = 0
  let cur = ''
  let inStr = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (inStr) {
      cur += ch
      if (ch === "'") {
        if (str[i + 1] === "'") {
          cur += str[++i]
        } else {
          inStr = false
        }
      }
      continue
    }
    if (ch === "'") {
      inStr = true
      cur += ch
      continue
    }
    if (ch === '(') {
      depth++
      cur += ch
      continue
    }
    if (ch === ')') {
      depth--
      cur += ch
      if (depth === 0) {
        rows.push(cur)
        cur = ''
      }
      continue
    }
    if (ch === ',' && depth === 0) {
      if (cur.trim()) rows.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) rows.push(cur.trim())
  return rows
}

/** Tách 1 hàng VALUES thành mảng giá trị đã chuẩn hoá. */
function parseRow(row) {
  const inner = row.trim().replace(/^\(/, '').replace(/\)$/, '')
  const out = []
  let cur = ''
  let inStr = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (inStr) {
      if (ch === "'") {
        if (inner[i + 1] === "'") {
          cur += "'"
          i++
        } else {
          inStr = false
        }
      } else {
        cur += ch
      }
      continue
    }
    if (ch === "'") {
      inStr = true
      continue
    }
    if (ch === ',') {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out.map(coerce)
}
function coerce(v) {
  if (v === 'NULL' || v === '') return null
  const n = Number(v)
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(v)) return n
  return v
}

const tables = {}
const re = /INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*([\s\S]*?);/gi
let m
while ((m = re.exec(sql)) !== null) {
  const table = m[1]
  const cols = m[2].split(',').map((c) => c.trim())
  const rows = splitValues(m[3]).map(parseRow)
  if (!tables[table]) tables[table] = []
  for (const r of rows) {
    const obj = {}
    cols.forEach((c, i) => {
      obj[c] = r[i] === undefined ? null : r[i]
    })
    tables[table].push(obj)
  }
}

const outDir = path.join(ROOT, 'src', 'data')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(
  path.join(outDir, 'db.json'),
  JSON.stringify(tables, null, 0),
  'utf8'
)

const summary = Object.entries(tables)
  .map(([k, v]) => `${k}: ${v.length}`)
  .join('\n')
console.log(`Đã trích xuất ${Object.keys(tables).length} bảng:\n${summary}`)
