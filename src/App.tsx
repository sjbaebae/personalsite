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

const PageNav = ({ view }: { view: View }) => {
  const links = [
    ['desk', '/'],
    ['writing', '/?view=blog'],
    ['library', '/?view=library'],
  ] as const

  return (
    <nav className="mb-12 flex items-center gap-2 border-b border-[#1b1a17]/15 pb-5 font-mono text-[11px] uppercase tracking-[0.16em]">
      {links.map(([label, href]) => {
        const active =
          (label === 'desk' && view === 'desk') ||
          (label === 'writing' && view === 'blog') ||
          (label === 'library' && view === 'library')

        return (
          <a
            key={label}
            href={href}
            className={[
              'px-3 py-2 no-underline transition-colors',
              active
                ? 'border border-[#a8331c]/50 text-[#a8331c]'
                : 'text-[#6e6450] hover:text-[#1b1a17]',
            ].join(' ')}
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
      <div className="min-h-screen bg-[#5a3a1f] px-4 py-8 text-[#1b1a17] sm:px-6 sm:py-12">
        <main className="mx-auto min-h-[calc(100vh-6rem)] w-full max-w-4xl bg-[#f8f0d5] px-6 py-8 shadow-[0_24px_70px_rgba(20,8,0,0.45),inset_0_0_90px_rgba(80,55,20,0.10)] sm:px-12 sm:py-10">
          <PageNav view={view} />
          {view === 'blog' ? <Blog /> : <Library />}
        </main>
      </div>
    )
  }

  return (
    <>
      <HomepageDesk />
      {!introComplete && <Opening onComplete={handleIntroComplete} />}
    </>
  )
}
