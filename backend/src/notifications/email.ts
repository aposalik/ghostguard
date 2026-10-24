import type { SecurityFinding } from '@ghostguard/shared'

export interface AlertNotifier {
  send(finding: SecurityFinding): Promise<void>
}

export interface EmailNotifierOptions {
  apiUrl: string
  apiKey: string
  from: string
  to: string
  explorerUrl: string
  fetcher?: typeof fetch
}

export class EmailDeliveryError extends Error {
  override readonly name = 'EmailDeliveryError'
}

export class ResendEmailNotifier implements AlertNotifier {
  private readonly options: EmailNotifierOptions
  private readonly fetcher: typeof fetch

  constructor(options: EmailNotifierOptions) {
    this.options = options
    this.fetcher = options.fetcher ?? fetch
  }

  async send(finding: SecurityFinding): Promise<void> {
    const transactionUrl = `${this.options.explorerUrl.replace(/\/$/, '')}/tx/${finding.transactionHash}`
    const subject = `[GhostGuard] ${finding.classification} detected`
    const text = [
      `Classification: ${finding.classification}`,
      `Transaction: ${finding.transactionHash}`,
      `Emitter: ${finding.actualEmitterAddress}`,
      `Expected token: ${finding.expectedTokenAddress ?? 'not configured'}`,
      `Reason: ${finding.explanation}`,
      `Explorer: ${transactionUrl}`,
    ].join('\n')

    let response: Response
    try {
      response = await this.fetcher(this.options.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `ghostguard/${finding.id}`,
        },
        body: JSON.stringify({
          from: this.options.from,
          to: [this.options.to],
          subject,
          text,
          html: renderHtml(finding, transactionUrl),
        }),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (cause) {
      throw new EmailDeliveryError('Unable to reach the configured email provider.', { cause })
    }

    if (!response.ok) throw new EmailDeliveryError(`Email provider returned HTTP ${response.status}.`)
  }
}

function renderHtml(finding: SecurityFinding, transactionUrl: string): string {
  return `<!doctype html><html><body>`
    + `<h1>GhostGuard alert</h1>`
    + `<p><strong>Classification:</strong> ${escapeHtml(finding.classification)}</p>`
    + `<p><strong>Transaction:</strong> ${escapeHtml(finding.transactionHash)}</p>`
    + `<p><strong>Emitter:</strong> ${escapeHtml(finding.actualEmitterAddress)}</p>`
    + `<p><strong>Expected token:</strong> ${escapeHtml(finding.expectedTokenAddress ?? 'not configured')}</p>`
    + `<p><strong>Reason:</strong> ${escapeHtml(finding.explanation)}</p>`
    + `<p><a href="${escapeHtml(transactionUrl)}">View transaction</a></p>`
    + `<p>NEEDS_REVIEW means evidence is incomplete; it is not an automatic fraud verdict.</p>`
    + `</body></html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
