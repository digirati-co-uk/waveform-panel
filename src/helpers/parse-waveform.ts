import WaveformData from 'waveform-data';

export async function parseWaveform(buffer: ArrayBuffer) {
  return WaveformData.create(buffer);
}
