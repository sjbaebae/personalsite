type LibraryItem = {
  title: string
  kind: string
  note: string
  url?: string
}

const ITEMS: LibraryItem[] = [
  {
    title: 'Real Analysis I',
    kind: 'book',
    note: 'Terence Tao. First in the analysis series.',
  },
  {
    title: 'The Intelligent Investor',
    kind: 'book',
    note: 'Still pretty core in investing.',
    url: 'https://www.amazon.com/Intelligent-Investor-Revised-Continuously-Updated/dp/0060555661',
  },
  {
    title: 'An Observation on Generalization',
    kind: 'talk',
    note: 'Ilya Sutskever on a way to think about why models learn.',
    url: 'https://www.youtube.com/watch?v=AKMuA_TVz3A&t=1544s',
  },
  {
    title: 'Complexity Explorables',
    kind: 'site',
    note: 'Interactive visualizations of complex systems.',
    url: 'https://www.complexity-explorables.org/',
  },
  {
    title: 'Explorable Explanations',
    kind: 'site',
    note: 'Nicky Case and the broader tradition of learning by touching ideas.',
    url: 'https://explorabl.es/',
  },
]

export default function Library() {
  return (
    <main className="mx-auto max-w-2xl animate-fade-in py-4">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">library</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Things I find interesting, useful, or worth coming back to.
        </p>
      </header>

      <div className="divide-y divide-white/10 border-y border-white/10">
        {ITEMS.map((item) => {
          const content = (
            <>
              <div className="mb-2 flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  {item.kind}
                </span>
                <h2 className="text-lg font-medium tracking-tight">{item.title}</h2>
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">{item.note}</p>
            </>
          )

          return item.url ? (
            <a
              key={item.title}
              href={item.url}
              target="_blank"
              rel="noopener"
              className="block py-6 no-underline transition-colors hover:text-[var(--accent)]"
            >
              {content}
            </a>
          ) : (
            <article key={item.title} className="py-6">
              {content}
            </article>
          )
        })}
      </div>
    </main>
  )
}
