import { useState } from 'react'
import Shell from './components/Shell'
import Overview from './pages/Overview'
import Queries from './pages/Queries'
import Charts from './pages/Charts'
import Schema from './pages/Schema'

export default function App() {
  const [page, setPage] = useState('tong-quan')

  return (
    <Shell active={page} onNavigate={setPage}>
      {page === 'tong-quan' && <Overview onNavigate={setPage} />}
      {page === 'truy-van' && <Queries />}
      {page === 'do-ho' && <Charts />}
      {page === 'luoc-do' && <Schema />}
    </Shell>
  )
}
