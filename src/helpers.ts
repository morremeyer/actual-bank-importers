export function parseAmountCents(raw: string) {
  // German decimal notation: "-1.630,00" → -163000
  const s = raw.trim().replace(/ | /g, "").replace(/\./g, "").replace(",", ".")
  return Math.round(parseFloat(s) * 100)
}
