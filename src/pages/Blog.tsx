import type { ReactNode } from 'react'

type Post = {
  title: string
  date: string
  slug: string
  dek: string
  readTime: string
  content: ReactNode
}

const POSTS: Post[] = []

const getSelectedPost = () => {
  const slug = new URLSearchParams(window.location.search).get('post')
  return POSTS.find((post) => post.slug === slug) ?? null
}

const BlogPost = ({ post }: { post: Post }) => (
  <article className="mx-auto max-w-2xl animate-fade-in">
    <a
      href="/?view=blog"
      className="mb-10 inline-block font-mono text-xs text-[var(--muted)] hover:text-[var(--fg)]"
    >
      ← all writing
    </a>

    <header className="mb-10 border-b border-white/10 pb-8">
      <div className="mb-4 font-mono text-xs text-[var(--muted)]">
        {post.date} · {post.readTime}
      </div>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight">
        {post.title}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
        {post.dek}
      </p>
    </header>

    <div className="space-y-6 text-[16px] leading-8 text-[var(--fg)]/90">
      {post.content}
    </div>
  </article>
)

export default function Blog() {
  const selectedPost = getSelectedPost()
  if (selectedPost) return <BlogPost post={selectedPost} />

  return (
    <main className="mx-auto max-w-2xl animate-fade-in py-4">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">writing</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Essays, notes, and longer thoughts will live here. Nothing is published yet.
        </p>
      </header>

      {POSTS.length > 0 ? (
        <div className="divide-y divide-white/10">
          {POSTS.map((post) => (
            <a
              key={post.slug}
              href={`?post=${post.slug}`}
              className="block py-7 transition-colors hover:text-[var(--accent)]"
            >
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-medium tracking-tight">{post.title}</h2>
                <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                  {post.date}
                </span>
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">{post.dek}</p>
            </a>
          ))}
        </div>
      ) : (
        <section className="border-y border-white/10 py-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
            coming soon
          </p>
          <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">
            The blog layout is ready; the posts are not.
          </p>
        </section>
      )}
    </main>
  )
}
