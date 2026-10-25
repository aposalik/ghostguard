import { AppHeader } from '../components/AppHeader'
import { GhostBloom } from '../components/GhostBloom'
import { SiteFooter } from '../components/SiteFooter'

const methodSteps = [
  {
    index: '01',
    title: 'Read the receipt',
    detail: 'GhostGuard asks Monad for the execution receipt instead of trusting a wallet label or UI message.',
    tone: 'violet',
    icon: '⌁',
  },
  {
    index: '02',
    title: 'Find the emitter',
    detail: 'Every Transfer-shaped log is traced back to the contract address that physically emitted it.',
    tone: 'coral',
    icon: '◎',
  },
  {
    index: '03',
    title: 'Ground the verdict',
    detail: 'Trusted token address, decoded topics, receipt state, and known demo contracts determine the result.',
    tone: 'lime',
    icon: '✓',
  },
]

const proofCards = [
  { value: '10143', label: 'Monad Testnet', detail: 'Live chain evidence', tone: 'violet' },
  { value: '2', label: 'Real findings', detail: 'Verified + spoofed', tone: 'cream' },
  { value: '64', label: 'Automated tests', detail: 'Frontend, API, contracts', tone: 'lime' },
]

const loopNodes = [
  { label: 'Observe', detail: 'Finalized logs', marker: '01' },
  { label: 'Inspect', detail: 'Receipt + emitter', marker: '02' },
  { label: 'Classify', detail: 'Grounded checks', marker: '03' },
  { label: 'Persist', detail: 'Canonical identity', marker: '04' },
  { label: 'Notify', detail: 'Realtime signal', marker: '05' },
]

export function HomePage() {
  return (
    <div className="portfolio-shell home-page">
      <AppHeader currentPage="home" />

      <main>
        <section className="portfolio-hero" aria-labelledby="home-title">
          <div className="hero-noise" />
          <div className="portfolio-width hero-layout">
            <div className="portfolio-hero-copy">
              <p className="portfolio-kicker">On-chain transfer intelligence · Monad Testnet</p>
              <h1 id="home-title">
                <span className="hero-script">Proof</span>
                <span className="hero-block-line">BEFORE</span>
                <span className="hero-block-line">PROMISES.</span>
              </h1>
              <p className="portfolio-hero-lede">
                GhostGuard follows the receipt, finds the real log emitter, and exposes Transfer events that look
                legitimate but never touched the trusted token contract.
              </p>
              <div className="hero-actions">
                <a className="portfolio-button button-dark" href="#/try-it">
                  Inspect a transaction <span aria-hidden="true">↗</span>
                </a>
                <a className="text-link" href="#about">Read the field guide ↓</a>
              </div>
            </div>
            <GhostBloom />
          </div>
          <div className="portfolio-width hero-ticker" aria-label="GhostGuard principles">
            <span>RECEIPT CHECKED</span>
            <span>ACTUAL EMITTER</span>
            <span>NO INVENTED VERDICTS</span>
            <span>LIVE MONAD DATA</span>
          </div>
        </section>

        <section className="problem-section" id="about">
          <div className="portfolio-width problem-layout">
            <div>
              <p className="section-index">01 / THE PROBLEM</p>
              <h2>EVENTS CAN<br />LIE.</h2>
              <p className="problem-aside">A successful transaction only proves execution—not the story a UI tells about it.</p>
            </div>

            <div className="phantom-receipt" aria-label="Illustration of a suspicious transfer-shaped event">
              <div className="receipt-topline">
                <span>TRANSFER EVENT</span>
                <span className="receipt-alert">EMITTER MISMATCH</span>
              </div>
              <div className="receipt-ghost" aria-hidden="true">
                <span className="ghost-eye" /><span className="ghost-eye" />
              </div>
              <dl>
                <div><dt>Receipt</dt><dd>SUCCESS</dd></div>
                <div><dt>Claim</dt><dd>25 GGD</dd></div>
                <div><dt>Emitter</dt><dd>NOT DEMOTOKEN</dd></div>
              </dl>
              <span className="receipt-stamp">LOOK AGAIN</span>
            </div>

            <div className="problem-copy">
              <span className="giant-number">01</span>
              <h3>A contract emits a familiar `Transfer` signature.</h3>
              <p>Wallets and explorers may present it like a token payment—even when the trusted token contract never emitted that log.</p>
              <div className="problem-rule" />
              <span className="giant-number">02</span>
              <h3>GhostGuard checks who actually spoke.</h3>
              <p>The log emitter is compared with the trusted token address before any verified verdict is allowed.</p>
            </div>
          </div>
        </section>

        <section className="method-section" id="method">
          <div className="portfolio-width">
            <div className="method-heading-row">
              <p className="section-index dark-index">02 / THE METHOD</p>
              <h2>HOW<br />GHOSTGUARD<br />WORKS</h2>
              <div className="method-orb" aria-hidden="true"><span>GG</span></div>
            </div>
            <div className="method-card-grid">
              {methodSteps.map((step) => (
                <article className={`method-card tone-${step.tone}`} key={step.index}>
                  <div className="method-card-top"><span>{step.index}</span><span className="method-icon">{step.icon}</span></div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
            <p className="method-footnote">One event shape. Three evidence layers. Zero guesswork.</p>
          </div>
        </section>

        <section className="proof-section" id="proof">
          <div className="portfolio-width">
            <p className="section-index light-index">03 / SHIPPED PROOF</p>
            <h2>REAL CHAIN.<br />REAL RECEIPTS.</h2>
            <p className="proof-intro">GhostGuard is not a concept screen. The public build reads Monad Testnet, classifies two deployed demo contracts, persists findings, and streams them live.</p>
            <div className="proof-card-grid">
              {proofCards.map((proof) => (
                <article className={`proof-card tone-${proof.tone}`} key={proof.label}>
                  <span className="proof-card-value">{proof.value}</span>
                  <strong>{proof.label}</strong>
                  <span>{proof.detail}</span>
                </article>
              ))}
            </div>
            <div className="proof-action-row">
              <a className="portfolio-button button-cream" href="#/try-it">Open the live inspector <span>→</span></a>
              <span>Public API · WebSocket · SQLite · Resend alerts</span>
            </div>
          </div>
        </section>

        <section className="matter-section">
          <div className="portfolio-width">
            <div className="matter-title-row">
              <div className="matter-shield" aria-hidden="true"><span>?</span></div>
              <div>
                <p className="section-index dark-index">04 / WHY IT MATTERS</p>
                <h2>TRUST THE<br />EVIDENCE TRAIL.</h2>
              </div>
            </div>
            <blockquote>“A familiar event signature is not proof of a familiar asset movement.”</blockquote>
            <div className="matter-strip">
              <article><span>REAL</span><strong>RECEIPTS</strong><i>✓</i></article>
              <article><span>REAL</span><strong>EMITTERS</strong><i>◎</i></article>
              <article><span>HONEST</span><strong>UNCERTAINTY</strong><i>?</i></article>
            </div>
            <p className="matter-note">Unknown evidence stays `NEEDS_REVIEW`. GhostGuard never upgrades ambiguity into an accusation.</p>
          </div>
        </section>

        <section className="loop-section">
          <div className="portfolio-width">
            <p className="section-index light-index">05 / THE DETECTION LOOP</p>
            <h2>FROM LOG<br />TO SIGNAL.</h2>
            <div className="loop-track">
              {loopNodes.map((node, index) => (
                <article className="loop-node" key={node.marker}>
                  <span className="loop-marker">{node.marker}</span>
                  <div className="loop-core"><strong>{node.label}</strong><span>{node.detail}</span></div>
                  {index < loopNodes.length - 1 && <span className="loop-arrow" aria-hidden="true">→</span>}
                </article>
              ))}
            </div>
            <p className="loop-caption">A bounded, restart-safe path from finalized Monad blocks to a human-readable alert.</p>
          </div>
        </section>

        <section className="team-section" id="team">
          <div className="portfolio-width">
            <p className="section-index dark-index">06 / THE BUILDERS</p>
            <h2>MEET THE<br />GUARDIANS.</h2>
            <p className="team-intro">Two builders, one evidence-first security system—shipped for Monad Blitz Ankara.</p>
            <div className="team-grid">
              <article className="team-card team-violet">
                <div className="team-avatar" aria-hidden="true"><span>F</span></div>
                <h3>Fahad</h3>
                <p>Frontend · Product interface · Live evidence experience</p>
                <span className="team-label">THE INTERFACE</span>
              </article>
              <article className="team-card team-coral">
                <div className="team-avatar" aria-hidden="true"><span>S</span></div>
                <h3>Salik</h3>
                <p>Contracts · Analyzer · Watcher · Public infrastructure</p>
                <span className="team-label">THE ENGINE</span>
              </article>
              <article className="team-card team-lime">
                <div className="team-avatar ghost-avatar" aria-hidden="true"><span>GG</span></div>
                <h3>GhostGuard</h3>
                <p>Deterministic on-chain evidence, explained without hype.</p>
                <span className="team-label">THE GUARDIAN</span>
              </article>
            </div>
          </div>
        </section>

        <section className="roadmap-section">
          <div className="portfolio-width roadmap-layout">
            <div>
              <p className="section-index light-index">07 / SHIP STATUS</p>
              <h2>BUILT.<br />LIVE.<br />LEARNING.</h2>
              <div className="roadmap-ghost" aria-hidden="true"><span /><span /></div>
            </div>
            <div className="roadmap-stack">
              <article><span>01 · FOUNDATION</span><strong>Contracts + deterministic analyzer</strong><em>SHIPPED</em></article>
              <article><span>02 · LIVE SYSTEM</span><strong>Watcher + persistence + realtime UI</strong><em>SHIPPED</em></article>
              <article><span>03 · NEXT DEPTH</span><strong>Balance-delta and broader token intelligence</strong><em>GROWING</em></article>
            </div>
          </div>
        </section>

        <section className="closing-cta">
          <div className="portfolio-width closing-layout">
            <div>
              <p className="section-index light-index">READY TO VERIFY?</p>
              <h2>DON'T TRUST<br />THE EVENT.</h2>
            </div>
            <div className="closing-action">
              <p>Paste a real Monad Testnet transaction and follow the evidence yourself.</p>
              <a className="portfolio-button button-lime" href="#/try-it">Try GhostGuard <span>↗</span></a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
