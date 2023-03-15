export function scaleY(amplitude: number, height: number, range = 128) {
  const h = height;

  if (range === 0) {
    range = 1;
  }

  const offset = range / 2;

  return h - ((amplitude + offset) * h) / range;
}
