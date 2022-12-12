export function scaleY(amplitude: number, height: number) {
  const range = 256;
  const offset = 128;

  return height - ((amplitude + offset) * height) / range;
}
