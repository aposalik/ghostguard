import { useEffect, useState } from 'react'
import { HomePage } from './pages/HomePage'
import { TryItPage } from './pages/TryItPage'

type AppPage = 'home' | 'try-it'

function getPageFromHash(): AppPage {
  return window.location.hash.startsWith('#/try-it') ? 'try-it' : 'home'
}

export default function App() {
  const [page, setPage] = useState<AppPage>(getPageFromHash)

  useEffect(() => {
    function handleHashChange() {
      const nextPage = getPageFromHash()
      setPage(nextPage)
      if (nextPage === 'try-it') {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return page === 'try-it' ? <TryItPage /> : <HomePage />
}
