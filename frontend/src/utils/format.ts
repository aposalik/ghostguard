export function shortenHex(value: string, edgeLength = 6): string {
  if (value.length <= edgeLength * 2 + 2) return value
  return `${value.slice(0, edgeLength + 2)}…${value.slice(-edgeLength)}`
}
