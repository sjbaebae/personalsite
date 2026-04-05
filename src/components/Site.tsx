import { useState } from 'react'
import Home from '../pages/Home'
import Blog from '../pages/Blog'
import Curated from '../pages/Curated'

const TABS = ['home', 'blog', 'curated'] as const
type Tab = (typeof TABS)[number]

export default function Site() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span
            className="font-mono text-sm text-[var(--muted)] cursor-pointer hover:text-[var(--fg)] transition-colors"
            onClick={() => setTab('home')}
          >
            sjb
          </span>
          <div className="flex gap-6">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm font-mono transition-colors ${
                  tab === t
                    ? 'text-[var(--fg)]'
                    : 'text-[var(--muted)] hover:text-[var(--fg)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 w-full">
        {tab === 'home' && <Home />}
        {tab === 'blog' && <Blog />}
        {tab === 'curated' && <Curated />}
      </main>
    </div>
  )
}
