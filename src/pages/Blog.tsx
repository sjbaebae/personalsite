const POSTS: { title: string; date: string; preview: string; slug: string }[] = []

export default function Blog() {
  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">blog</h1>
        <p className="text-[var(--muted)] text-sm">
          random thoughts
        </p>
      </section>

      <div className="space-y-6">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="group border border-white/5 rounded-lg p-5 hover:border-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[15px] font-medium group-hover:text-[var(--accent)] transition-colors">
                {post.title}
              </h2>
              <span className="text-xs font-mono text-[var(--muted)] shrink-0 ml-4">
                {post.date}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {post.preview}
            </p>
          </article>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)] font-mono pt-4">
        more coming soon...
      </p>
    </div>
  )
}
