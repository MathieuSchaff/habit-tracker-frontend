export const sentimentEmojis: Record<number, string> = {
  1: '🤢',
  2: '👎',
  3: '😐',
  4: '👍',
  5: '😍',
}

export function getSentimentEmoji(value: number | null | undefined): string | null {
  if (value == null) return null
  return sentimentEmojis[value] ?? null
}
