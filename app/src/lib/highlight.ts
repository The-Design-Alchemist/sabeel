/** The index of the word being spoken at time `t` (seconds), or -1 if between words. */
export function activeWordAt(
  words: { start: number; end: number }[],
  t: number
): number {
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].start && t < words[i].end) return i
  }
  return -1
}
