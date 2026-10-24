const steps = [
  'Transaction receipt',
  'Actual log emitter',
  'Trusted token match',
  'Evidence-based verdict',
]

export function ArchitecturePanel() {
  return (
    <section className="panel" aria-labelledby="proof-path-title">
      <div className="panel-heading">
        <h2 id="proof-path-title">Proof path</h2>
        <span className="panel-tag">4 checks</span>
      </div>
      <div className="architecture-list">
        {steps.map((step, index) => (
          <div className="architecture-step" key={step}>
            <span className="step-index">0{index + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
