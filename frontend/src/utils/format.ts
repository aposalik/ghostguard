export function shortenHex(value: string, edgeLength = 6): string {
  if (value.length <= edgeLength * 2 + 2) return value
  return `${value.slice(0, edgeLength + 2)}…${value.slice(-edgeLength)}`
}

export function formatTokenAmount(rawAmount: string, decimals = 18, symbol = 'DEMO'): string {
  if (!rawAmount || !/^\d+$/.test(rawAmount)) return rawAmount

  try {
    const big = BigInt(rawAmount)
    const factor = 10n ** BigInt(decimals)
    const whole = big / factor
    const fraction = big % factor

    if (fraction === 0n) {
      return `${whole.toLocaleString()} ${symbol}`
    }

    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '')
    return `${whole.toLocaleString()}.${fractionStr} ${symbol}`
  } catch {
    return `${rawAmount} (raw units)`
  }
}

export function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))

  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  return `${diffHours}h ago`
}

export function getExplorerTxUrl(hash: string): string {
  return `https://testnet.monadscan.com/tx/${hash}`
}

export function getExplorerAddressUrl(address: string): string {
  return `https://testnet.monadscan.com/address/${address}`
}
