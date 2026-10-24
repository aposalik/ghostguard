const steps = [
  {
    title: 'Transaction Receipt',
    detail: 'Asserts execution status (0x1 SUCCESS) vs revert on Monad Testnet.',
  },
  {
    title: 'Actual Log Emitter',
    detail: 'Extracts physical log.address to detect decoy contracts.',
  },
  {
    title: 'Trusted Token Match',
    detail: 'Cross-checks emitter against official DemoToken registry.',
  },
  {
    title: 'Grounded Verdict',
    detail: 'Produces immutable VERIFIED or EMITTER MISMATCH verdict.',
  },
]

export function ArchitecturePanel() {
  return (
    <section className="panel" aria-labelledby="proof-path-title">
      <div className="panel-heading">
        <div className="panel-heading-left">
          <span className="proof-path-icon" aria-hidden="true">◈</span>
          <h2 id="proof-path-title">Proof Path Architecture</h2>
        </div>
        <span className="panel-tag">4 Deterministic Checks</span>
      </div>
      <div className="architecture-list">
        {steps.map((step, index) => (
          <div className="architecture-step" key={step.title}>
            <span className="step-index">0{index + 1}</span>
            <div className="step-content">
              <span className="step-title">{step.title}</span>
              <span className="step-detail">{step.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
