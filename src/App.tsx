import { useState } from 'react'
import Opening from './components/Opening'
import HomepageDesk from './components/HomepageDesk'
import Blog from './pages/Blog'
import Library from './pages/Library'

const INTRO_SEEN_KEY = 'personal-site:intro-seen'
type View = 'desk' | 'blog' | 'library'

const getInitialView = (): View => {
  const view = new URLSearchParams(window.location.search).get('view')
  return view === 'blog' || view === 'library' ? view : 'desk'
}

const Nav = ({ view }: { view: View }) => {
  const links = [
    ['desk', '/'],
    ['writing', '/?view=blog'],
    ['library', '/?view=library'],
  ] as const

  return (
    <nav className="fixed right-5 top-5 z-[950] flex gap-4 rounded bg-[#0a0a0a]/70 px-4 py-2 font-mono text-xs backdrop-blur">
      {links.map(([label, href]) => {
        const active =
          (label === 'desk' && view === 'desk') ||
          (label === 'writing' && view === 'blog') ||
          (label === 'library' && view === 'library')

        return (
          <a
            key={label}
            href={href}
            className={active ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}
          >
            {label}
          </a>
        )
      })}
    </nav>
  )
}

export default function App() {
  const [view] = useState(getInitialView)
  const [introComplete, setIntroComplete] = useState(() => {
    try {
      return window.localStorage.getItem(INTRO_SEEN_KEY) === 'true'
    } catch {
      return false
    }
  })

  const handleIntroComplete = () => {
    try {
      window.localStorage.setItem(INTRO_SEEN_KEY, 'true')
    } catch {
      // Ignore storage failures; the intro can safely replay.
    }
    setIntroComplete(true)
  }

  if (view !== 'desk') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[var(--fg)]">
        <Nav view={view} />
        <main className="mx-auto w-full max-w-3xl px-6 py-12">
          {view === 'blog' ? <Blog /> : <Library />}
        </main>
      </div>
    )
  }

  return (
    <>
      <Nav view="desk" />
      <HomepageDesk />
      {!introComplete && <Opening onComplete={handleIntroComplete} />}
    </>
  )
}
