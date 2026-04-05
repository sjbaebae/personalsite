export default function Home() {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Intro */}
      <section>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          hey, i'm sung jae
        </h1>
        <p className="text-[var(--muted)] text-lg leading-relaxed">
          i like to think and build.
        </p>
      </section>

      {/* About */}
      <section className="space-y-4 text-[15px] leading-relaxed">
        <p>
          Really fascinated by a lot of things! 
          Worked at an ML company in hs. Made a club to pump out new students for solution at college.
          Did some research in neuroscience, continual learning, and aging but so many cool things to explore.

          Now figuring out the next thing.
        </p>
        <p>
          Want to work on big ideas that will matter for many years to come. Bigger and better.
          Currently in SF, so if in the area feel free to reach out! 
        </p>
      </section>

      {/* Beliefs - inspired by huxley's casual list style */}
      <section>
        <h2 className="font-mono text-sm text-[var(--accent)] mb-4">
          things i believe
        </h2>
        <ul className="space-y-2 text-[15px] text-[var(--fg)]/90">
          <li className="flex gap-2">
            <span className="text-[var(--accent)] shrink-0">~</span>
            <span>the world is more malleable than people think</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--accent)] shrink-0">~</span>
            <span>building with friends is the best</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--accent)] shrink-0">~</span>
            <span>so much time and so little time to do things</span>
          </li>
        </ul>
      </section>

      {/* Currently */}
      <section>
        <h2 className="font-mono text-sm text-[var(--accent)] mb-4">
          currently
        </h2>
        <ul className="space-y-2 text-[15px]">
          <li className="flex gap-2">
            <span className="text-[var(--muted)] shrink-0">&gt;</span>
            <span>trying to make better AI</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--muted)] shrink-0">&gt;</span>
            <span>building a consumer product</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--muted)] shrink-0">&gt;</span>
            <span>hit the gym consistently lol</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--muted)] shrink-0">&gt;</span>
            <span>exploring sf</span>
          </li>
        </ul>
      </section>

      {/* Contact */}
      <section>
        <h2 className="font-mono text-sm text-[var(--accent)] mb-4">
          say hi: sbae703@gmail.com
        </h2>
        <div className="flex gap-4 text-sm font-mono">
          <a href="https://github.com/hydral8" target="_blank" rel="noopener">
            github
          </a>
          <a href="https://linkedin.com/in/sungjaebae" target="_blank" rel="noopener">
            linkedin
          </a>
          <a href="https://x.com/sunjaebae" target="_blank" rel="noopener">
            x
          </a>
        </div>
      </section>
    </div>
  )
}
