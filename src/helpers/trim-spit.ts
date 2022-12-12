export function trimSplit(input: string, splitOn?: string) {
  const trimmed = (input || '').replace(/\n/, '').trim();

  if (typeof splitOn !== 'undefined') {
    return trimmed.split(splitOn);
  }

  return trimmed;
}

