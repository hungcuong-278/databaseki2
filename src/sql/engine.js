/* ============================================================================
 * Mini SQL engine (MySQL-flavored) chạy trên dữ liệu JSON trong bộ nhớ.
 * Hỗ trợ: SELECT/JOIN/WHERE/GROUP BY/HAVING/ORDER BY/LIMIT, CTE (WITH),
 * self-join, subquery tương quan, tổng hợp (COUNT/SUM/AVG/...), CASE WHEN,
 * hàm ngày (DATEDIFF, DATE_ADD, TIMESTAMPDIFF), GROUP_CONCAT, window LEAD().
 * ==========================================================================*/

const KEYWORDS = new Set([
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT',
  'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'NULL', 'IS', 'LIKE', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'ON',
  'WITH', 'ASC', 'DESC', 'DIV', 'MOD', 'INTERVAL', 'OVER', 'PARTITION', 'TRUE', 'FALSE',
  'ROLLUP', 'SEPARATOR', 'REGEXP', 'BETWEEN',
])

/* -------------------------------------------------------------------------- */
/* Tokenizer                                                                  */
/* -------------------------------------------------------------------------- */
function tokenize(sql) {
  const toks = []
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '-' && sql[i + 1] === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue }
    if (c === '/' && sql[i + 1] === '*') { i += 2; while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++; i += 2; continue }
    if (c === "'") {
      let j = i + 1
      let s = ''
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { s += "'"; j += 2; continue }
        if (sql[j] === "'") break
        s += sql[j++]
      }
      toks.push({ t: 'str', v: s }); i = j + 1; continue
    }
    if (c === '"' || c === '`') {
      const q = c; let j = i + 1; let s = ''
      while (j < sql.length && sql[j] !== q) s += sql[j++]
      toks.push({ t: 'id', v: s, quoted: true }); i = j + 1; continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++
      toks.push({ t: 'num', v: Number(sql.slice(i, j)) }); i = j; continue
    }
    if (/[A-Za-z_À-ỹ]/.test(c)) {
      let j = i
      while (j < sql.length && /[A-Za-z0-9_À-ỹ]/.test(sql[j])) j++
      const w = sql.slice(i, j)
      toks.push({ t: KEYWORDS.has(w.toUpperCase()) ? 'kw' : 'id', v: w })
      i = j; continue
    }
    if (c === '@') {
      let j = i + 1
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++
      toks.push({ t: 'param', v: '@' + sql.slice(i + 1, j) }); i = j; continue
    }
    const two = sql.substr(i, 2)
    if (['<=', '>=', '<>', '!='].includes(two)) {
      toks.push({ t: 'op', v: two === '!=' ? '<>' : two }); i += 2; continue
    }
    if (['+', '-', '*', '/', '%', '=', '<', '>', ',', '(', ')', '.', '|'].includes(c)) {
      toks.push({ t: 'op', v: c }); i++; continue
    }
    if (c === ';') { i++; continue }
    throw new Error(`Ký tự không hợp lệ: "${c}"`)
  }
  return toks
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                     */
/* -------------------------------------------------------------------------- */
class Parser {
  constructor(toks) { this.toks = toks; this.p = 0 }
  peek(k = 0) { return this.toks[this.p + k] }
  next() { return this.toks[this.p++] }
  isKw(v, k = 0) { const t = this.peek(k); return t && t.t === 'kw' && t.v.toUpperCase() === v }
  isOp(v, k = 0) { const t = this.peek(k); return t && t.t === 'op' && t.v === v }
  eatKw(v) { if (this.isKw(v)) { this.p++; return true } return false }
  eatOp(v) { if (this.isOp(v)) { this.p++; return true } return false }
  expectKw(v) { if (!this.eatKw(v)) throw new Error(`Cần từ khoá ${v}, gặp "${this.peek()?.v}"`) }
  expectOp(v) { if (!this.eatOp(v)) throw new Error(`Cần "${v}", gặp "${this.peek()?.v}"`) }

  parseQuery() {
    let ctes = null
    if (this.isKw('WITH')) {
      this.p++
      ctes = []
      do {
        const name = this.next().v
        this.expectKw('AS')
        this.expectOp('(')
        const q = this.parseSelect()
        this.expectOp(')')
        ctes.push({ name, query: q })
      } while (this.eatOp(','))
    }
    const select = this.parseSelect()
    return { ctes, select }
  }

  parseSelect() {
    this.expectKw('SELECT')
    const distinct = this.eatKw('DISTINCT')
    const items = []
    do {
      items.push(this.parseSelectItem())
    } while (this.eatOp(','))
    const q = { type: 'select', distinct, items }

    if (this.eatKw('FROM')) {
      q.from = this.parseFrom()
    }
    if (this.eatKw('WHERE')) q.where = this.parseExpr()
    if (this.isKw('GROUP')) {
      this.p += 2 // GROUP BY
      q.groupBy = []
      do { q.groupBy.push(this.parseExpr()) } while (this.eatOp(','))
      if (this.isKw('WITH')) {
        this.p++
        this.expectKw('ROLLUP')
        q.rollup = true
      }
    }
    if (this.eatKw('HAVING')) q.having = this.parseExpr()
    if (this.isKw('ORDER')) {
      this.p += 2 // ORDER BY
      q.orderBy = []
      do {
        const expr = this.parseExpr()
        let dir = 'ASC'
        if (this.eatKw('DESC')) dir = 'DESC'
        else this.eatKw('ASC')
        q.orderBy.push({ expr, dir })
      } while (this.eatOp(','))
    }
    if (this.eatKw('LIMIT')) {
      q.limit = this.parseExpr()
      if (this.eatOp(',')) q.offset = this.parseExpr()
    }
    return q
  }

  parseSelectItem() {
    if (this.isOp('*')) { this.p++; return { star: true } }
    // table.* — đã bị tokenizer gộp? không: id . *
    if (this.peek().t === 'id' && this.isOp('.', 1) && this.isOp('*', 2)) {
      const t = this.next().v; this.p += 2
      return { star: true, table: t }
    }
    const expr = this.parseExpr()
    let alias = null
    if (this.eatKw('AS')) alias = this.next().v
    else if (this.peek() && (this.peek().t === 'id' || (this.peek().t === 'kw' && !['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'ON', 'AND', 'OR', 'AS'].includes(this.peek().v.toUpperCase())))) {
      alias = this.next().v
    }
    return { expr, alias }
  }

  parseFrom() {
    const items = []
    do {
      const t = this.parseTableRef()
      items.push(t)
    } while (this.eatOp(','))
    // joins
    for (;;) {
      let type = 'INNER'
      if (this.eatKw('LEFT')) { this.eatKw('OUTER'); type = 'LEFT' }
      else if (this.eatKw('RIGHT')) { this.eatKw('OUTER'); type = 'RIGHT' }
      else if (this.eatKw('INNER')) type = 'INNER'
      else if (this.eatKw('CROSS')) type = 'CROSS'
      if (!this.isKw('JOIN')) break
      this.p++
      const t = this.parseTableRef()
      t.joinType = type
      this.expectKw('ON')
      t.on = this.parseExpr()
      items.push(t)
    }
    return items
  }

  parseTableRef() {
    // Bảng dẫn xuất: (SELECT ...) alias
    if (this.isOp('(')) {
      this.p++
      const sub = this.parseQuery()
      this.expectOp(')')
      let alias = null
      if (this.eatKw('AS')) alias = this.next().v
      else if (this.peek() && this.peek().t === 'id') alias = this.next().v
      return { name: alias || '__derived', alias, sub }
    }
    const name = this.next().v
    let alias = null
    if (this.eatKw('AS')) alias = this.next().v
    else if (this.peek() && this.peek().t === 'id') alias = this.next().v
    return { name, alias, sub: null }
  }

  /* ------------------------------ expressions ------------------------------ */
  parseExpr() { return this.parseOr() }

  parseOr() {
    let left = this.parseAnd()
    while (this.eatKw('OR')) left = { type: 'or', left, right: this.parseAnd() }
    return left
  }
  parseAnd() {
    let left = this.parseNot()
    while (this.eatKw('AND')) left = { type: 'and', left, right: this.parseNot() }
    return left
  }
  parseNot() {
    // NOT EXISTS / EXISTS phải được xử lý trước khi parse biểu thức khác
    if (this.isKw('NOT') && this.isKw('EXISTS', 1)) {
      this.p += 2
      return { type: 'exists', sub: this.parseSubquery(), neg: true }
    }
    if (this.eatKw('EXISTS')) {
      return { type: 'exists', sub: this.parseSubquery(), neg: false }
    }
    if (this.eatKw('NOT')) return { type: 'not', expr: this.parseNot() }
    return this.parseComparison()
  }
  parseComparison() {
    let left = this.parseAdditive()
    for (;;) {
      if (this.isKw('BETWEEN')) {
        this.p++
        const lo = this.parseAdditive()
        this.expectKw('AND')
        const hi = this.parseAdditive()
        left = { type: 'between', expr: left, lo, hi, neg: false }
        continue
      }
      if (this.isKw('NOT') && this.isKw('BETWEEN', 1)) {
        this.p += 2
        const lo = this.parseAdditive()
        this.expectKw('AND')
        const hi = this.parseAdditive()
        left = { type: 'between', expr: left, lo, hi, neg: true }
        continue
      }
      if (this.isKw('IS')) {
        this.p++
        const neg = this.eatKw('NOT')
        this.expectKw('NULL')
        left = { type: 'isnull', expr: left, neg }
        continue
      }
      if (this.isKw('NOT') && this.isKw('IN', 1)) {
        this.p += 2
        left = { type: 'in', expr: left, list: this.parseInList(), neg: true }
        continue
      }
      if (this.eatKw('IN')) { left = { type: 'in', expr: left, list: this.parseInList(), neg: false }; continue }
      if (this.isKw('NOT') && this.isKw('LIKE', 1)) {
        this.p += 2
        left = { type: 'like', expr: left, pattern: this.parseAdditive(), neg: true }
        continue
      }
      if (this.eatKw('LIKE')) { left = { type: 'like', expr: left, pattern: this.parseAdditive(), neg: false }; continue }
      if (this.peek() && this.peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(this.peek().v)) {
        const op = this.next().v
        left = { type: 'cmp', op, left, right: this.parseAdditive() }
        continue
      }
      break
    }
    return left
  }
  parseInList() {
    this.expectOp('(')
    if (this.isKw('SELECT')) {
      const q = this.parseSelect(); this.expectOp(')')
      return { sub: q }
    }
    const list = []
    do { list.push(this.parseExpr()) } while (this.eatOp(','))
    this.expectOp(')')
    return { list }
  }
  parseSubquery() {
    this.expectOp('(')
    const q = this.parseQuery()
    this.expectOp(')')
    return q
  }
  parseAdditive() {
    let left = this.parseMultiplicative()
    while (this.peek() && this.peek().t === 'op' && (this.peek().v === '+' || this.peek().v === '-')) {
      const op = this.next().v
      left = { type: 'arith', op, left, right: this.parseMultiplicative() }
    }
    return left
  }
  parseMultiplicative() {
    let left = this.parseUnary()
    for (;;) {
      if (this.peek() && this.peek().t === 'op' && ['*', '/', '%'].includes(this.peek().v)) {
        const op = this.next().v
        left = { type: 'arith', op, left, right: this.parseUnary() }
        continue
      }
      if (this.isKw('DIV')) { this.p++; left = { type: 'arith', op: 'DIV', left, right: this.parseUnary() }; continue }
      if (this.isKw('MOD')) { this.p++; left = { type: 'arith', op: 'MOD', left, right: this.parseUnary() }; continue }
      break
    }
    return left
  }
  parseUnary() {
    if (this.isOp('-')) { this.p++; return { type: 'neg', expr: this.parseUnary() } }
    if (this.isOp('+')) { this.p++; return this.parseUnary() }
    return this.parsePrimary()
  }
  parsePrimary() {
    const t = this.peek()
    if (!t) throw new Error('Hết token')
    if (t.t === 'num') { this.p++; return { type: 'lit', v: t.v } }
    if (t.t === 'str') { this.p++; return { type: 'lit', v: t.v } }
    if (t.t === 'param') { this.p++; return { type: 'param', name: t.v } }
    if (t.t === 'kw' && t.v.toUpperCase() === 'NULL') { this.p++; return { type: 'lit', v: null } }
    if (t.t === 'kw' && t.v.toUpperCase() === 'TRUE') { this.p++; return { type: 'lit', v: 1 } }
    if (t.t === 'kw' && t.v.toUpperCase() === 'FALSE') { this.p++; return { type: 'lit', v: 0 } }
    if (this.isKw('CASE')) return this.parseCase()
    if (this.isKw('INTERVAL')) return this.parseInterval()
    if (t.t === 'op' && t.v === '(') {
      const save = this.p
      this.p++
      if (this.isKw('SELECT')) {
        const q = this.parseQuery(); this.expectOp(')')
        return { type: 'sub', query: q }
      }
      this.p = save
      this.p++
      const e = this.parseExpr()
      this.expectOp(')')
      return e
    }
    if (t.t === 'id') {
      // function call?
      if (this.isOp('(', 1)) {
        const name = this.next().v
        this.p++ // (
        const upper = name.toUpperCase()
        if (upper === 'GROUP_CONCAT') {
          const spec = this.parseExpr()
          const gc = { type: 'func', name: 'GROUP_CONCAT', args: [spec], orderBy: null, separator: ', ' }
          if (this.eatKw('ORDER')) {
            this.expectKw('BY')
            const e = this.parseExpr()
            let dir = 'ASC'
            if (this.eatKw('DESC')) dir = 'DESC'
            else this.eatKw('ASC')
            gc.orderBy = { expr: e, dir }
          }
          if (this.eatKw('SEPARATOR')) gc.separator = this.next().v
          this.expectOp(')')
          return gc        }
        const args = []
        if (!this.isOp(')')) {
          do {
            // special: COUNT(*)
            if (this.isOp('*')) { this.p++; args.push({ type: 'star' }); continue }
            if (this.isKw('DISTINCT')) { this.p++ }
            args.push(this.parseExpr())
          } while (this.eatOp(','))
        }
        this.expectOp(')')
        // OVER clause
        let over = null
        if (this.eatKw('OVER')) {
          this.expectOp('(')
          over = { partitionBy: [], orderBy: [] }
          while (!this.isOp(')')) {
            if (this.eatKw('PARTITION')) { this.expectKw('BY'); do { over.partitionBy.push(this.parseExpr()) } while (this.eatOp(',')) }
            else if (this.eatKw('ORDER')) { this.expectKw('BY'); do { const e = this.parseExpr(); let dir = 'ASC'; if (this.eatKw('DESC')) dir = 'DESC'; else this.eatKw('ASC'); over.orderBy.push({ expr: e, dir }) } while (this.eatOp(',')) }
            else this.p++
          }
          this.expectOp(')')
        }
        return { type: 'func', name: name.toUpperCase(), args, over }
      }
      // column ref
      this.p++
      if (this.isOp('.')) {
        this.p++
        const col = this.next().v
        return { type: 'col', table: t.v, name: col }
      }
      return { type: 'col', table: null, name: t.v }
    }
    throw new Error(`Token không hợp lệ: ${JSON.stringify(t)}`)
  }
  parseCase() {
    this.expectKw('CASE')
    // CASE <điều kiện> WHEN ... : so sánh với điều kiện
    // CASE WHEN <biểu thức> ... : dạng searched, điều kiện là boolean
    const node = { type: 'case', whens: [], else: null, searched: false }
    if (!this.isKw('WHEN')) {
      node.expr = this.parseExpr()
    } else {
      node.searched = true
    }
    while (this.eatKw('WHEN')) {
      const cond = this.parseExpr()
      this.expectKw('THEN')
      const res = this.parseExpr()
      node.whens.push({ cond, res })
    }
    if (this.eatKw('ELSE')) node.else = this.parseExpr()
    this.expectKw('END')
    return node
  }
  parseInterval() {
    this.expectKw('INTERVAL')
    const n = this.parseAdditive()
    const unit = this.next().v.toUpperCase()
    return { type: 'interval', expr: n, unit }
  }
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */
const MONTHS = { MONTH: 'month', MONTHS: 'month', YEAR: 'year', YEARS: 'year', DAY: 'day', DAYS: 'day' }
function toDate(v) {
  if (v instanceof Date) return v
  if (typeof v !== 'string') return null
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0)
}
function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function dateAdd(d, n, unit) {
  const out = new Date(d.getTime())
  if (unit === 'year') out.setFullYear(out.getFullYear() + n)
  else if (unit === 'month') {
    const day = out.getDate()
    out.setDate(1)
    out.setMonth(out.getMonth() + n)
    const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate()
    out.setDate(Math.min(day, last))
  } else out.setDate(out.getDate() + n)
  return out
}

/* -------------------------------------------------------------------------- */
/* Aggregate detection                                                        */
/* -------------------------------------------------------------------------- */
const AGGREGATES = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT'])
function containsAggregate(node) {
  if (!node || typeof node !== 'object') return false
  if (node.type === 'func') {
    if (AGGREGATES.has(node.name)) return true
    return node.args.some(containsAggregate)
  }
  if (node.type === 'case') {
    if (node.expr && containsAggregate(node.expr)) return true
    if (node.whens.some((w) => containsAggregate(w.cond) || containsAggregate(w.res))) return true
    if (node.else && containsAggregate(node.else)) return true
    return false
  }
  for (const k of ['left', 'right', 'expr', 'cond', 'res', 'list']) {
    if (node[k] && containsAggregate(node[k])) return true
  }
  if (node.list && node.list.list) return node.list.list.some(containsAggregate)
  if (node.args) return node.args.some(containsAggregate)
  return false
}

/* -------------------------------------------------------------------------- */
/* Evaluator                                                                  */
/* -------------------------------------------------------------------------- */
function truthy(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return v.toLowerCase() === 'true' ? 1 : v.toLowerCase() === 'false' ? 0 : (v === '' ? 0 : 1)
  return 1
}
function num(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}
function cmpValues(a, b) {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0
  const da = toDate(a), db = toDate(b)
  if (da && db && /^\d{4}-\d{2}-\d{2}/.test(String(a)) && /^\d{4}-\d{2}-\d{2}/.test(String(b))) {
    return da < db ? -1 : da > db ? 1 : 0
  }
  const sa = String(a), sb = String(b)
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

class Executor {
  constructor(db, params = {}) {
    this.db = db
    this.params = params
    this.ctes = new Map()
  }

  run(sqlText) {
    const p = new Parser(tokenize(sqlText))
    const q = p.parseQuery()
    return this.execQuery(q, null)
  }

  execQuery(q, outerCtx) {
    // Chấp nhận cả node SELECT lẻ lẫn wrapper { ctes, select }
    if (q && q.type === 'select') {
      return this.execSelect(q, outerCtx)
    }
    // 1. CTE
    const savedCtes = new Map(this.ctes)
    if (q.ctes) {
      for (const cte of q.ctes) {
        const res = this.execQuery(cte.query, outerCtx)
        this.ctes.set(cte.name.toLowerCase(), res)
      }
    }
    const result = this.execSelect(q.select, outerCtx)
    this.ctes = savedCtes
    return result
  }

  /* --------------------------- FROM / JOIN --------------------------- */
  buildFrom(fromItems, outerCtx) {
    let rows = []
    for (let idx = 0; idx < fromItems.length; idx++) {
      const item = fromItems[idx]
      const src = this.resolveSource(item, outerCtx)
      const alias = item.alias || item.name
      const prefixed = src.rows.map((r) => {
        const o = {}
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('__')) { o[k] = v; continue }
          // Bảng dẫn xuất (CTE / subquery): bỏ tiền tố bảng gốc, chỉ giữ tên cột
          const key = src.derived ? k.replace(/^[^.]+\./, '') : k
          o[`${alias}.${key}`] = v
        }
        return o
      })
      if (idx === 0) { rows = prefixed; continue }
      // join
      const joinType = item.joinType || 'INNER'
      const out = []
      for (const left of rows) {
        let matched = false
        for (const right of prefixed) {
          const combined = { ...left, ...right }
          const ok = item.on ? truthy(this.eval(item.on, { row: combined, outer: outerCtx })) === 1 : true
          if (ok) { out.push(combined); matched = true }
        }
        if (!matched && joinType === 'LEFT') {
          const combined = { ...left }
          for (const r of prefixed) {
            for (const k of Object.keys(r)) if (!k.startsWith('__')) combined[k] = null
          }
          out.push(combined)
        }
      }
      rows = out
    }
    return rows
  }

  resolveSource(item, outerCtx) {
    if (item.sub) {
      const res = this.execQuery(item.sub, outerCtx)
      return { rows: res.rows, derived: true }
    }
    const lower = item.name.toLowerCase()
    if (this.ctes.has(lower)) return { rows: this.ctes.get(lower).rows, derived: true }
    const tbl = this.db[item.name]
    if (!tbl) throw new Error(`Không tìm thấy bảng "${item.name}"`)
    return { rows: tbl.map((r) => ({ ...r })), derived: false }
  }

  /* ---------------------------- SELECT ---------------------------- */
  execSelect(sel, outerCtx) {
    let rows = sel.from ? this.buildFrom(sel.from, outerCtx) : [{ __dummy: 1 }]
    rows.forEach((r, i) => { r.__idx = i })

    if (sel.where) {
      rows = rows.filter((r) => truthy(this.eval(sel.where, { row: r, outer: outerCtx })) === 1)
    }

    // group
    const hasAgg = sel.items.some((it) => it.expr && containsAggregate(it.expr)) ||
      (sel.having && containsAggregate(sel.having))
    let groups
    if (sel.groupBy && sel.groupBy.length) {
      const map = new Map()
      for (const r of rows) {
        const key = sel.groupBy.map((g) => JSON.stringify(this.eval(g, { row: r, outer: outerCtx }))).join('')
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(r)
      }
      groups = [...map.values()]
    } else if (hasAgg) {
      groups = rows.length ? [rows] : [[]]
    } else {
      groups = rows.map((r) => [r])
    }

    // WITH ROLLUP: thêm dòng tổng theo từng cấp tiền tố của GROUP BY
    let rollupMeta = null
    if (sel.rollup && sel.groupBy && sel.groupBy.length) {
      const full = groups
      const extra = []
      for (let p = sel.groupBy.length - 1; p >= 0; p--) {
        const buckets = new Map()
        for (const g of full) {
          const rep = g[0]
          const key = sel.groupBy.slice(0, p).map((ge) => JSON.stringify(this.eval(ge, { row: rep, outer: outerCtx }))).join('')
          if (!buckets.has(key)) buckets.set(key, [])
          buckets.get(key).push(...g)
        }
        for (const [, g] of buckets) {
          if (g.length === 0) continue
          extra.push({ group: g, nullFrom: p })
        }
      }
      rollupMeta = extra
      groups = [...full, ...extra.map((e) => e.group)]
    }

    // having
    if (sel.having) {
      groups = groups.filter((g) => truthy(this.eval(sel.having, { row: g[0], group: g, rows: g, outer: outerCtx })) === 1)
    }

    // select list
    let outRows = []
    const columns = []
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const rm = rollupMeta ? rollupMeta.find((e) => e.group === g) : null
      const ctx = {
        row: g[0] ?? {},
        group: g,
        rows: g,
        outer: outerCtx,
        level: rows,
        groupByExprs: sel.groupBy || [],
        rollupNullFrom: rm ? rm.nullFrom : null,
      }
      const obj = {}
      const src = g[0] ?? {}
      for (const item of sel.items) {
        if (item.star) {
          const keys = Object.keys(src).filter((k) => !k.startsWith('__') && (item.table ? k.startsWith(item.table + '.') : true))
          for (const k of keys) {
            const label = item.table ? k.slice(item.table.length + 1) : k
            obj[label] = src[k]
            if (!columns.includes(label)) columns.push(label)
          }
          continue
        }
        const label = item.alias || exprLabel(item.expr)
        obj[label] = this.eval(item.expr, ctx)
        if (!columns.includes(label)) columns.push(label)
      }
      obj.__row = src
      obj.__group = g
      outRows.push(obj)
    }

    // distinct
    if (sel.distinct) {
      const seen = new Set()
      const filtered = outRows.filter((r) => {
        const k = columns.map((c) => JSON.stringify(r[c])).join('')
        if (seen.has(k)) return false
        seen.add(k); return true
      })
      outRows.length = 0
      outRows.push(...filtered)
    }

    // order by
    if (sel.orderBy) {
      const decorated = outRows.map((r, i) => ({ r, i }))
      for (const ob of sel.orderBy) {
        decorated.sort((a, b) => {
          let av, bv
          if (ob.expr.type === 'lit' && typeof ob.expr.v === 'number') {
            av = a.r[columns[ob.expr.v - 1]]; bv = b.r[columns[ob.expr.v - 1]]
          } else if (ob.expr.type === 'col') {
            const lbl = ob.expr.table ? `${ob.expr.table}.${ob.expr.name}` : ob.expr.name
            if (Object.prototype.hasOwnProperty.call(a.r, lbl)) { av = a.r[lbl]; bv = b.r[lbl] }
            else if (Object.prototype.hasOwnProperty.call(a.r, ob.expr.name)) { av = a.r[ob.expr.name]; bv = b.r[ob.expr.name] }
            else {
              av = this.eval(ob.expr, { row: a.r.__row, group: a.r.__group, rows: a.r.__group, outer: outerCtx, level: rows })
              bv = this.eval(ob.expr, { row: b.r.__row, group: b.r.__group, rows: b.r.__group, outer: outerCtx, level: rows })
            }
          } else {
            av = this.eval(ob.expr, { row: a.r.__row, group: a.r.__group, rows: a.r.__group, outer: outerCtx, level: rows })
            bv = this.eval(ob.expr, { row: b.r.__row, group: b.r.__group, rows: b.r.__group, outer: outerCtx, level: rows })
          }
          const c = cmpValues(av, bv)
          return ob.dir === 'DESC' ? -c : c
        })
      }
      outRows.length = 0
      outRows.push(...decorated.map((d) => d.r))
    }

    // limit
    let limit = sel.limit ? Number(this.eval(sel.limit, { row: {}, outer: outerCtx })) : null
    let offset = sel.offset ? Number(this.eval(sel.offset, { row: {}, outer: outerCtx })) : 0
    if (limit !== null) outRows = outRows.slice(offset, offset + limit)

    return { columns, rows: outRows }
  }

  /* --------------------------- expression eval --------------------------- */
  eval(node, ctx) {
    if (!node) return null
    switch (node.type) {
      case 'lit': return node.v
      case 'param': return this.params[node.name] ?? null
      case 'col': {
        const row = ctx.row || {}
        // Với dòng ROLLUP: các cột nhóm từ vị trí nullFrom trở đi phải là NULL
        if (ctx.rollupNullFrom !== null && ctx.rollupNullFrom !== undefined && ctx.groupByExprs) {
          const gi = ctx.groupByExprs.findIndex((ge) => exprLabel(ge) === node.name)
          if (gi >= 0 && gi >= ctx.rollupNullFrom) return null
        }
        if (node.table) {
          const k = `${node.table}.${node.name}`
          // 1. Bảng được đích danh -> tìm trong phạm vi hiện tại
          if (k in row) return row[k]
          // 2. Subquery tương quan: cột của bảng ngoài
          const or = ctx.outer && ctx.outer.row
          if (or && k in or) return or[k]
          // 3. Self-join với alias khác: tìm hậu tố duy nhất
          const suf = '.' + node.name
          const cands = Object.keys(row).filter((x) => x.endsWith(suf) && !x.startsWith('__'))
          if (cands.length === 1) return row[cands[0]]
          if (or) {
            const oc = Object.keys(or).filter((x) => x.endsWith(suf) && !x.startsWith('__'))
            if (oc.length === 1) return or[oc[0]]
          }
          return null
        }
        if (node.name in row) return row[node.name]
        // tìm trong nhóm
        if (ctx.group) {
          for (const g of ctx.group) {
            if (node.name in g) return g[node.name]
            const suf2 = '.' + node.name
            const c2 = Object.keys(g).filter((x) => x.endsWith(suf2) && !x.startsWith('__'))
            if (c2.length === 1) return g[c2[0]]
          }
        }
        // tên cột không có tiền tố bảng: tìm khóa duy nhất kết thúc bằng ".tên"
        const suf = '.' + node.name
        const cands = Object.keys(row).filter((x) => x.endsWith(suf) && !x.startsWith('__'))
        if (cands.length === 1) return row[cands[0]]
        // phạm vi ngoài (subquery tương quan)
        if (ctx.outer && ctx.outer.row) {
          const or = ctx.outer.row
          if (node.name in or) return or[node.name]
          const oc = Object.keys(or).filter((x) => x.endsWith(suf) && !x.startsWith('__'))
          if (oc.length === 1) return or[oc[0]]
        }
        return null
      }
      case 'and': return truthy(this.eval(node.left, ctx)) === 1 && truthy(this.eval(node.right, ctx)) === 1 ? 1 : 0
      case 'or': return truthy(this.eval(node.left, ctx)) === 1 || truthy(this.eval(node.right, ctx)) === 1 ? 1 : 0
      case 'not': return truthy(this.eval(node.expr, ctx)) === 1 ? 0 : 1
      case 'neg': { const v = num(this.eval(node.expr, ctx)); return v === null ? null : -v }
      case 'isnull': {
        const v = this.eval(node.expr, ctx)
        const isN = v === null || v === undefined
        return (node.neg ? !isN : isN) ? 1 : 0
      }
      case 'between': {
        const v = this.eval(node.expr, ctx)
        const lo = this.eval(node.lo, ctx)
        const hi = this.eval(node.hi, ctx)
        if (v === null) return null
        const inRange = cmpValues(v, lo) >= 0 && cmpValues(v, hi) <= 0
        return (node.neg ? !inRange : inRange) ? 1 : 0
      }
      case 'cmp': {
        const a = this.eval(node.left, ctx)
        const b = this.eval(node.right, ctx)
        if (node.op === '=') {
          if (a === null || b === null) return null
          return cmpValues(a, b) === 0 ? 1 : 0
        }
        if (node.op === '<>') {
          if (a === null || b === null) return null
          return cmpValues(a, b) !== 0 ? 1 : 0
        }
        const c = cmpValues(a, b)
        return node.op === '<' ? (c < 0 ? 1 : 0) : node.op === '>' ? (c > 0 ? 1 : 0)
          : node.op === '<=' ? (c <= 0 ? 1 : 0) : (c >= 0 ? 1 : 0)
      }
      case 'arith': {
        const a = this.eval(node.left, ctx)
        const b = this.eval(node.right, ctx)
        if (node.op === '+' && typeof a === 'string' && typeof b === 'string') return a + b
        const x = num(a), y = num(b)
        if (x === null || y === null) return null
        switch (node.op) {
          case '+': return x + y
          case '-': return x - y
          case '*': return x * y
          case '/': return y === 0 ? null : x / y
          case '%': return y === 0 ? null : x % y
          case 'DIV': return y === 0 ? null : Math.floor(x / y)
          case 'MOD': return y === 0 ? null : x % y
        }
        return null
      }
      case 'in': {
        const v = this.eval(node.expr, ctx)
        const list = node.list
        let found = false
        if (list.sub) {
          const res = this.execQuery(list.sub, correlatedCtx(ctx))
          const vals = res.rows.map((r) => res.columns.map((c) => r[c])[0])
          found = vals.some((x) => cmpValues(v, x) === 0)
        } else {
          const vals = list.list.map((e) => this.eval(e, ctx))
          found = vals.some((x) => cmpValues(v, x) === 0)
        }
        return (node.neg ? !found : found) ? 1 : 0
      }
      case 'like': {
        const v = this.eval(node.expr, ctx)
        const p = this.eval(node.pattern, ctx)
        if (v === null || p === null) return null
        const rx = new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i')
        const m = rx.test(String(v))
        return (node.neg ? !m : m) ? 1 : 0
      }      case 'exists': {
        const res = this.execQuery(node.sub, correlatedCtx(ctx))
        const has = res.rows.length > 0
        return (node.neg ? !has : has) ? 1 : 0
      }
      case 'sub': {
        const res = this.execQuery(node.query, correlatedCtx(ctx))
        if (!res.rows.length) return null
        const first = res.columns[0]
        return res.rows[0][first]
      }
      case 'interval': {
        const v = this.eval(node.expr, ctx)
        const d = toDate(v)
        if (!d) return null
        return fmtDate(dateAdd(d, num(v) || 0, MONTHS[node.unit] || 'day'))
      }
      case 'case': {
        const base = node.expr ? this.eval(node.expr, ctx) : null
        for (const w of node.whens) {
          // Dạng searched: điều kiện là biểu thức boolean
          // Dạng simple (CASE x WHEN y): so sánh x với y
          const c = node.searched
            ? truthy(this.eval(w.cond, ctx)) === 1
            : cmpValues(base, this.eval(w.cond, ctx)) === 0
          if (c) return this.eval(w.res, ctx)
        }
        return node.else ? this.eval(node.else, ctx) : null
      }
      case 'func': return this.evalFunc(node, ctx)
      default: return null
    }
  }

  evalFunc(node, ctx) {
    const name = node.name
    if (node.over) return this.evalWindow(node, ctx)

    if (AGGREGATES.has(name)) {
      const groupRows = ctx.rows || (ctx.row ? [ctx.row] : [])
      return this.evalAggregate(node, groupRows, ctx)
    }

    const args = node.args.map((a) => (a.type === 'star' ? null : this.eval(a, ctx)))

    switch (name) {
      case 'CONCAT': {
        // MySQL: CONCAT trả về NULL nếu bất kỳ đối số nào là NULL
        if (args.some((a) => a === null || a === undefined)) return null
        return args.map((a) => String(a)).join('')
      }
      case 'COALESCE': { for (const a of args) if (a !== null && a !== undefined) return a; return null }
      case 'IF': return truthy(args[0]) === 1 ? args[1] : args[2]
      case 'NULLIF': return cmpValues(args[0], args[1]) === 0 ? null : args[0]
      case 'IFNULL': return args[0] === null || args[0] === undefined ? args[1] : args[0]
      case 'ROUND': {
        const v = num(args[0]); if (v === null) return null
        const d = args.length > 1 ? (num(args[1]) ?? 0) : 0
        const f = Math.pow(10, d)
        return Math.round((v + Number.EPSILON) * f) / f
      }
      case 'FLOOR': { const v = num(args[0]); return v === null ? null : Math.floor(v) }
      case 'CEIL': { const v = num(args[0]); return v === null ? null : Math.ceil(v) }
      case 'ABS': { const v = num(args[0]); return v === null ? null : Math.abs(v) }
      case 'YEAR': { const d = toDate(args[0]); return d ? d.getFullYear() : null }
      case 'MONTH': { const d = toDate(args[0]); return d ? d.getMonth() + 1 : null }
      case 'DAY': { const d = toDate(args[0]); return d ? d.getDate() : null }
      case 'DATE': {
        const d = toDate(args[0]); if (!d) return null
        return fmtDate(d)
      }
      case 'DATEDIFF': {
        const a = toDate(args[0]), b = toDate(args[1])
        if (!a || !b) return null
        return Math.round((a - b) / 86400000)
      }
      case 'TIMESTAMPDIFF': {
        // Đơn vị có thể là literal ('YEAR') hoặc identifier trần (YEAR)
        const unitNode = node.args[0]
        let unit
        if (unitNode.type === 'lit') unit = String(unitNode.v)
        else if (unitNode.type === 'col' && !unitNode.table) unit = unitNode.name
        else unit = String(this.eval(unitNode, ctx) ?? '')
        unit = unit.toUpperCase()
        const a = toDate(this.eval(node.args[1], ctx))
        const b = toDate(this.eval(node.args[2], ctx))
        if (!a || !b) return null
        if (unit === 'YEAR') {
          let y = b.getFullYear() - a.getFullYear()
          if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--
          return y
        }
        if (unit === 'MONTH') {
          let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
          if (b.getDate() < a.getDate()) m--
          return m
        }
        if (unit === 'DAY') return Math.round((b - a) / 86400000)
        if (unit === 'HOUR') return Math.round((b - a) / 3600000)
        if (unit === 'MINUTE') return Math.round((b - a) / 60000)
        if (unit === 'SECOND') return Math.round((b - a) / 1000)
        return Math.round((b - a) / 1000)
      }
      case 'DATE_ADD': {
        const d = toDate(args[0])
        const iv = node.args[1]
        if (!d || iv.type !== 'interval') return null
        const n = num(this.eval(iv.expr, ctx)) || 0
        const out = dateAdd(d, n, MONTHS[iv.unit] || 'day')
        if (/[ T]\d{2}:\d{2}/.test(String(args[0]))) {
          return `${fmtDate(out)} ${String(args[0]).slice(11, 16)}`
        }
        return fmtDate(out)
      }
      case 'DATE_SUB': {
        const d = toDate(args[0])
        const iv = node.args[1]
        if (!d || iv.type !== 'interval') return null
        const n = num(this.eval(iv.expr, ctx)) || 0
        return fmtDate(dateAdd(d, -n, MONTHS[iv.unit] || 'day'))
      }
      case 'NOW': case 'CURDATE': return new Date().toISOString().slice(0, 10)
      case 'UPPER': return String(args[0] ?? '').toUpperCase()
      case 'LOWER': return String(args[0] ?? '').toLowerCase()
      case 'TRIM': return String(args[0] ?? '').trim()
      case 'LENGTH': return String(args[0] ?? '').length
      case 'SUBSTRING': return String(args[0] ?? '').substr((num(args[1]) ?? 1) - 1, num(args[2]) ?? undefined)
      case 'GREATEST': { const v = args.filter((x) => x !== null).map(Number); return v.length ? Math.max(...v) : null }
      case 'LEAST': { const v = args.filter((x) => x !== null).map(Number); return v.length ? Math.min(...v) : null }
      case 'FIELD': {
        // FIELD(expr, v1, v2, ...) -> vị trí (1-based) của expr trong danh sách, 0 nếu không có
        const target = args[0]
        for (let i = 1; i < args.length; i++) {
          if (cmpValues(target, args[i]) === 0) return i
        }
        return 0
      }
      default: {
        // hàm chưa hỗ trợ
        return null
      }
    }
  }

  evalAggregate(node, groupRows, ctx) {
    const name = node.name
    if (name === 'COUNT') {
      if (node.args[0] && node.args[0].type === 'star') return groupRows.length
      let c = 0
      for (const r of groupRows) {
        const v = this.eval(node.args[0], { row: r, rows: groupRows, outer: ctx.outer })
        if (v !== null && v !== undefined) c++
      }
      return c
    }
    if (name === 'GROUP_CONCAT') {
      const parts = []
      const spec = node.args[0]
      let ordered = groupRows
      if (node.orderBy) {
        const e = node.orderBy.expr
        ordered = groupRows.slice().sort((a, b) => {
          const av = this.eval(e, { row: a })
          const bv = this.eval(e, { row: b })
          const c = cmpValues(av, bv)
          return node.orderBy.dir === 'DESC' ? -c : c
        })
      }
      for (const r of ordered) {
        const v = this.eval(spec, { row: r, rows: groupRows, outer: ctx.outer })
        if (v !== null && v !== undefined) parts.push(String(v))
      }
      return parts.join(node.separator ?? ', ')
    }
    const vals = []
    for (const r of groupRows) {
      const v = this.eval(node.args[0], { row: r, rows: groupRows, outer: ctx.outer })
      if (v === null || v === undefined) continue
      if (typeof v === 'boolean') vals.push(v ? 1 : 0)
      else {
        const n = Number(v)
        vals.push(Number.isNaN(n) ? v : n)
      }
    }
    if (name === 'SUM') {
      let s = 0, any = false
      for (const v of vals) { const n = Number(v); if (!Number.isNaN(n)) { s += n; any = true } }
      return any ? s : null
    }
    if (name === 'AVG') {
      if (!vals.length) return null
      const nums = vals.map(Number).filter((n) => !Number.isNaN(n))
      if (!nums.length) return null
      return nums.reduce((a, b) => a + b, 0) / nums.length
    }
    if (name === 'MIN') { if (!vals.length) return null; return vals.reduce((a, b) => (cmpValues(a, b) <= 0 ? a : b)) }
    if (name === 'MAX') { if (!vals.length) return null; return vals.reduce((a, b) => (cmpValues(a, b) >= 0 ? a : b)) }
    return null
  }

  evalWindow(node, ctx) {
    const over = node.over
    const level = ctx.level || []
    const groups = new Map()
    for (const r of level) {
      const key = over.partitionBy.map((p) => JSON.stringify(this.eval(p, { row: r }))).join('')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(r)
    }
    const out = new Map()
    for (const g of groups.values()) {
      const sorted = g.slice()
      for (const ob of over.orderBy) {
        sorted.sort((a, b) => {
          const av = this.eval(ob.expr, { row: a })
          const bv = this.eval(ob.expr, { row: b })
          const c = cmpValues(av, bv)
          return ob.dir === 'DESC' ? -c : c
        })
      }
      sorted.forEach((r, i) => {
        let val = null
        if (node.name === 'LEAD') {
          const off = node.args[1] ? Number(this.eval(node.args[1], { row: r })) : 1
          const target = sorted[i + off]
          val = target ? this.eval(node.args[0], { row: target }) : null
        } else if (node.name === 'LAG') {
          const off = node.args[1] ? Number(this.eval(node.args[1], { row: r })) : 1
          const target = sorted[i - off]
          val = target ? this.eval(node.args[0], { row: target }) : null
        } else if (node.name === 'ROW_NUMBER') val = i + 1
        else if (node.name === 'RANK') val = i + 1
        out.set(r.__idx, val)
      })
    }
    const myIdx = ctx.row ? ctx.row.__idx : undefined
    return out.has(myIdx) ? out.get(myIdx) : null
  }
}

/**
 * Tạo ngữ cảnh ngoài cho subquery tương quan: truyền xuống hàng hiện tại
 * để các cột không tiền tố bảng trong subquery biết giá trị của hàng ngoài.
 */
function correlatedCtx(ctx) {
  const outer = ctx.outer
  const base = outer ? { ...outer } : { row: {} }
  if (ctx.row && Object.keys(ctx.row).length) {
    base.row = { ...(base.row || {}), ...ctx.row }
  }
  base.outer = outer
  return base
}

function exprLabel(expr) {
  switch (expr.type) {
    case 'col': return expr.name // MySQL trả về tên cột trần, không kèm tiền tố bảng
    case 'lit': return String(expr.v)
    case 'func': return `${expr.name}(${expr.args.map(exprLabel).join(', ')})`
    case 'case': return 'CASE'
    default: return expr.type
  }
}

/** Chạy một câu SQL và trả về { columns, rows } (rows là mảng object). */
export function runSql(db, sqlText, params = {}) {
  const ex = new Executor(db, params)
  const res = ex.run(sqlText)
  return {
    columns: res.columns,
    rows: res.rows.map((r) => {
      const o = {}
      for (const c of res.columns) o[c] = r[c]
      return o
    }),
  }
}

/** Chạy nhiều câu (bỏ qua lỗi, trả về mảng kết quả). */
export function runSqlBatch(db, statements, params = {}) {
  return statements.map((s) => {
    try {
      return { ok: true, ...runSql(db, s.sql, params) }
    } catch (e) {
      return { ok: false, error: e.message, columns: [], rows: [] }
    }
  })
}
