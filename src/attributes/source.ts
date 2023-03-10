import { trimSplit } from '../helpers/trim-spit';
import { WaveformStoreProps } from '../../src/store';

export function parseSource(srcset: string) {
  const allSources: WaveformStoreProps['sources'] = [];
  // Option 1: Legacy comma separated values.
  if (srcset.indexOf('#') === -1 && srcset.indexOf(',') !== -1) {
    // Legacy parsing.
    const sources = trimSplit(srcset, ',');
    for (const src of sources) {
      const [waveform, id = waveform] = trimSplit(src, ' ');
      if (id && waveform) {
        allSources.push({ id, waveform, data: null });
      }
    }
  } else {
    const sources = trimSplit(srcset, '|');
    for (const src of sources) {
      const [waveform, id] = trimSplit(src, ' ');
      const parsed: WaveformStoreProps['sources'][number] = { id, waveform, data: null };
      if (id && id.indexOf('#t=') !== -1) {
        // Deal with hash.
        const [newId, time] = trimSplit(id, '#t=');
        const [start, end] = trimSplit(time, ',');

        const startTime = parseFloat(start);
        const endTime = parseFloat(end);

        if (!Number.isNaN(startTime) && !Number.isNaN(endTime)) {
          parsed.segment = {
            start: startTime,
            end: endTime,
            id,
          };
          parsed.id = newId;
          parsed.duration = endTime - startTime;
        }
      }

      if (id && waveform) {
        allSources.push(parsed);
      }
    }
  }

  return allSources;
}
