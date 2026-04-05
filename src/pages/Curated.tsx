interface Item {
  title: string
  url: string
  note: string
  category: string
}

const ITEMS: Item[] = [
  {
    title: 'The Intelligent Investor',
    url: 'https://www.amazon.com/Intelligent-Investor-Revised-Continuously-Updated/dp/0060555661',
    note: 'Still pretty core in investing',
    category: 'book',
  },
  {
    title: "Ilya Sutskever: An Observation on Generalization",
    url: "https://www.youtube.com/watch?v=AKMuA_TVz3A&t=1544s",
    note: "A way to think about how models are able to learn?",
    category: "talk",
  },
  {
    title: 'Complexity Explorables',
    url: 'https://www.complexity-explorables.org/',
    note: 'interactive visualizations of complex systems',
    category: 'site',
  },
  {
    title: 'Nicky Case — Explorable Explanations',
    url: 'https://explorabl.es/',
    note: 'cool gems to learn',
    category: 'site',
  },
  {
    title: 'Machine Learning Systems Design',
    url: 'https://mlsysbook.ai/book/',
    note: 'Good place to get started on ml!',
    category: 'book',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  book: 'text-emerald-400',
  talk: 'text-amber-400',
  site: 'text-sky-400',
  paper: 'text-rose-400',
}

export default function Curated() {
  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          curated
        </h1>
        <p className="text-[var(--muted)] text-sm">
          things I think are cool!
        </p>
      </section>

      <div className="space-y-4">
        {ITEMS.map((item) => (
          <a
            key={item.title}
            href={item.url}
            target="_blank"
            rel="noopener"
            className="block border border-white/5 rounded-lg p-5 hover:border-white/10 transition-colors no-underline hover:no-underline"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  CATEGORY_COLORS[item.category] || 'text-[var(--muted)]'
                }`}
              >
                {item.category}
              </span>
              <h2 className="text-[15px] font-medium text-[var(--fg)]">
                {item.title}
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {item.note}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}


// Want to add these itesm to post:

// https://www.youtube.com/watch?v=AKMuA_TVz3A&t=1544s [Ilya Sutskever: An Observation on Generalization]