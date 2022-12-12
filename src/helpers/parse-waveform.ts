import WaveformData from 'waveform-data';

export async function parseWaveform(buffer: ArrayBuffer) {
  const waveform = WaveformData.create(buffer);

  console.log(`Waveform has ${waveform.channels} channels`);
  console.log(`Waveform has length ${waveform.length} points`);

  return waveform;
}
