import WaveformData from 'waveform-data';

class WaveformData2 {}

export async function parseWaveform(buffer: ArrayBuffer) {
  return WaveformData.create(buffer);
}
