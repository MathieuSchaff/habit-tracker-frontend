// Level 6 = Holy Grail. Folded into sentiment so HG isn't a status.
export const sentimentEmojis: Record<number, string> = {
  1: '🤢',
  2: '👎',
  3: '😐',
  4: '👍',
  5: '😍',
  6: '💎',
}

export function getSentimentEmoji(value: number | null | undefined): string | null {
  if (value == null) return null
  return sentimentEmojis[value] ?? null
}
