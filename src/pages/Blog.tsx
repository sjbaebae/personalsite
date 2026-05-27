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
      className="mb-10 inline-block font-mono text-xs text-[#6e6450] no-underline hover:text-[#1b1a17]"
    >
      ← all writing
    </a>

    <header className="mb-10 border-b border-[#1b1a17]/15 pb-8">
      <div className="mb-4 font-mono text-xs text-[#6e6450]">
        {post.date} · {post.readTime}
      </div>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight">
        {post.title}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-[#3a3025]">
        {post.dek}
      </p>
    </header>

    <div className="space-y-6 text-[16px] leading-8 text-[#1b1a17]/90">
      {post.content}
    </div>
  </article>
)

export default function Blog() {
  const selectedPost = getSelectedPost()
  if (selectedPost) return <BlogPost post={selectedPost} />

  return (
    <div className="mx-auto max-w-2xl animate-fade-in py-4">
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-[#1b1a17]">writing</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#6e6450]">
          Essays, notes, and longer thoughts will live here. Nothing is published yet.
        </p>
      </header>

      {POSTS.length > 0 ? (
        <div className="divide-y divide-[#1b1a17]/15">
          {POSTS.map((post) => (
            <a
              key={post.slug}
              href={`/?view=blog&post=${post.slug}`}
              className="block py-7 text-[#1b1a17] no-underline transition-colors hover:text-[#a8331c]"
            >
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-medium tracking-tight">{post.title}</h2>
                <span className="shrink-0 font-mono text-xs text-[#6e6450]">
                  {post.date}
                </span>
              </div>
              <p className="text-sm leading-6 text-[#6e6450]">{post.dek}</p>
            </a>
          ))}
        </div>
      ) : (
        <section className="border-y border-[#1b1a17]/15 py-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#a8331c]">
            coming soon
          </p>
          <p className="mt-4 text-[15px] leading-7 text-[#3a3025]">
            The blog layout is ready; the posts are not.
          </p>
        </section>
      )}
    </div>
  )
}
