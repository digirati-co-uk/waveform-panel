export function scaleY(amplitude: number, height: number, range = 128) {
  const h = height;
  const offset = range / 2;

  return h - ((amplitude + offset) * h) / range;
}
