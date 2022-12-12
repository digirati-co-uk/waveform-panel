import create from 'zustand/vanilla';
import { StoreApi } from 'zustand';
import WaveformData from 'waveform-data';
import { trimSplit } from './helpers/trim-spit';
import { WaveformPanelAttributes } from './web-components/waveform-panel';
import { parseWaveform } from './helpers/parse-waveform';

interface WaveformStoreProps {
  // Properties.
  duration: number;

  // State.
  currentTime: number;
  hoverTime: number;
  bufferedSlices: any[];
  isLoading: boolean;
  dimensions: {
    pageX: number;
    pageY: number;
    height: number;
    width: number;
    dpi: number;
  };
  mouse: {
    isHover: boolean;
    isActive: boolean;
  };

  // Derived.
  sources: Array<{ waveform: string; id: string; data: WaveformData | null }>;
  sequence: WaveformSequence[];
}

export type WaveformSequence = {
  id: string;
  startTime: number;
  endTime: number;
  waveform: null | {
    data: WaveformData;
    atWidth: number;
    startPixel: number;
  };
};

export interface WaveformStoreState extends WaveformStoreProps {
  setDimensions(box: DOMRect, dpi?: number): void;

  setAttributes(props: WaveformPanelAttributes): Promise<void>;

  resize(): Promise<void>;
}

export type WaveformStore = StoreApi<WaveformStoreState>;

export function createWaveformStore(props: WaveformStoreProps) {
  return create<WaveformStoreState>()((setState, getState, store) => ({
    ...props,
    duration: 0,
    currentTime: 0,
    hoverTime: 0,
    bufferedSlices: [],
    waveforms: [],
    dimensions: {
      pageX: 0,
      pageY: 0,
      height: 0,
      width: 0,
      dpi: 0,
    },
    isLoading: true,
    mouse: {
      isHover: false,
      isActive: false,
    },

    setDimensions(box: DOMRect, dpi = 0) {
      // @todo do an equality check
      setState({
        dimensions: {
          width: box.width,
          height: box.height,
          pageY: box.y,
          pageX: box.x,
          dpi,
        },
      });

      getState().resize(); // Let this kick off in the background
    },

    async resize() {
      const freshState = getState();
      // Need to rebuild our sequences.
      const newSequence: WaveformStoreState['sequence'] = [];
      let didChange = false;
      let accumulator = 0;

      for (const sequence of freshState.sequence) {
        // Goal: set correct sequence waveform.
        const waveform = freshState.sources.find((r) => r.id === sequence.id);
        if (waveform && waveform.data) {
          //
          // 1. Re-sample.

          const sequenceLengthSeconds = (sequence.endTime || waveform.data.duration) - (sequence.startTime || 0);
          const sequencePercent = sequenceLengthSeconds / freshState.duration;
          const visualWidth = freshState.dimensions.width * sequencePercent;
          const percentOfWaveformShown = Math.min(1, sequenceLengthSeconds / waveform.data.duration);
          const startPixel = (accumulator / freshState.duration) * freshState.dimensions.width;
          const data = waveform.data.resample({ width: visualWidth * (1 / percentOfWaveformShown) });
          didChange = true;
          newSequence.push({
            ...sequence,
            waveform: {
              data,
              atWidth: visualWidth,
              startPixel,
            },
          });
        } else {
          newSequence.push(sequence);
        }

        accumulator += sequence.endTime - sequence.startTime;
      }
      if (didChange) {
        setState({ sequence: newSequence });
      }
    },

    async setAttributes(props: WaveformPanelAttributes) {
      const promises: Promise<any>[] = [];
      const state: Partial<WaveformStoreState> = { isLoading: true };

      if (typeof props.duration !== 'undefined') {
        state.duration = parseFloat(props.duration);
      }

      if (typeof props['current-time'] !== 'undefined') {
        state.currentTime = Number(props['current-time']);
      }

      if (props.srcset !== 'undefined') {
        const srcset: Array<{ waveform: string; id: string; data: null }> = [];
        const sources = trimSplit(props.srcset, ',');
        for (const src of sources) {
          const [waveform, id = waveform] = trimSplit(src, ' ');
          if (waveform) {
            srcset.push({ id, waveform, data: null });
            promises.push(
              fetch(waveform)
                .then((r) => r.arrayBuffer())
                .then((r) => parseWaveform(r))
                .then((data) => {
                  setState((s) => ({
                    sources: s.sources.map((source) => {
                      if (source.id === id) {
                        return { ...source, data };
                      }
                      return source;
                    }),
                  }));
                })
            );
          }
        }
        // This is replacing... but it could be smarter.
        state.sources = srcset;
      } else if (typeof props.src !== 'undefined') {
        const [waveform, id = waveform] = trimSplit(props.src, ',');
        if (waveform) {
          state.sources = [{ id, waveform, data: null }];
        }
      }

      if (typeof props.sequence !== 'undefined') {
        const sequence: Array<{ id: string; startTime: number; endTime: number; waveform: null }> = [];
        const sequences = trimSplit(props.sequence, '|');
        // default#t=0,10|default#t=10,20
        for (const seq of sequences) {
          const [url, time] = trimSplit(seq, '#t=');
          const [start, end] = trimSplit(time, ',');
          sequence.push({
            startTime: parseFloat(start),
            endTime: parseFloat(end),
            id: url,
            waveform: null,
          });
        }
        state.sequence = sequence;
      }

      setState(state);

      if (promises.length) {
        try {
          await Promise.all(promises);
        } catch (e) {
          console.error(e);
          // ignore.
        }
        setState({ isLoading: false });
        // Now we can rebuild the sequence.
        await getState().resize();
        return;
      }

      setState({ isLoading: false });
    },
  }));
}