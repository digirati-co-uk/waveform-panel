import create from 'zustand/vanilla';
import { StoreApi } from 'zustand';
import WaveformData from 'waveform-data';
import { trimSplit } from './helpers/trim-spit';
import { WaveformPanelAttributes } from './web-components/waveform-panel';
import { parseWaveform } from './helpers/parse-waveform';
import { parseSource } from './attributes/source';

export interface WaveformStoreProps {
  // Properties.
  duration: number;
  quality: number;

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

  pointer: {
    isDown: boolean;
  };

  // Derived.
  sources: Array<{
    waveform: string;
    id: string;
    data: WaveformData | null;
    duration?: number;
    segment?: { id: string; start: number; end: number };
  }>;
  sequence: WaveformSequence[];
}

export type WaveformSequence = {
  id: string;
  source: string;
  startTime: number;
  endTime: number;
  waveform: null | {
    data: WaveformData;
    atWidth: number;
    startPixel: number;
    quality: number;
    segment?: { id: string; start: number; end: number };
  };
};

export interface WaveformStoreState extends WaveformStoreProps {
  setDimensions(box: DOMRect, dpi?: number): void;

  setHover(x: number): void;

  setAttributes(props: WaveformPanelAttributes): Promise<void>;

  resize(): Promise<void>;
}

export type WaveformStore = StoreApi<WaveformStoreState>;

const globalDeferredLoading = {};

export function createWaveformStore(props: WaveformStoreProps) {
  return create<WaveformStoreState>()((setState, getState, store) => ({
    sources: [],
    sequence: [],
    ...props,
    duration: 0,
    currentTime: 0,
    hoverTime: 0,
    quality: 1,
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
    pointer: {
      isDown: false,
    },
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
    },

    setHover(x: number) {
      setState((state) => {
        const percent = Math.abs(x) / state.dimensions.width;
        const time = state.duration * percent;
        return {
          hoverTime: time,
        };
      });
    },

    async fetchWaveform(waveform: string) {
      if (waveform) {
        return fetch(waveform)
          .then((r) => r.arrayBuffer())
          .then((r) => parseWaveform(r))
          .then((data) => {
            setState((s) => ({
              sources: (s.sources || []).map((source) => {
                if (source.waveform === waveform) {
                  // @todo check if existing duration does not match new duration.
                  return { ...source, duration: data.duration, data };
                }
                return source;
              }),
            }));

            return data;
          });
      }
    },

    resize: async function () {
      const freshState = getState();
      // Need to rebuild our sequences.
      const newSequence: WaveformStoreState['sequence'] = [];
      let didChange = false;
      let accumulator = 0;

      const freshSequence =
        freshState.sequence && freshState.sequence.length !== 0
          ? freshState.sequence
          : (freshState.sources || []).map((source, k) => {
              return {
                startTime: source.segment ? source.segment.start : 0,
                endTime: source.segment ? source.segment.end : freshState.duration,
                id: source.id,
                source: source.id + k,
                waveform: null,
              };
            });

      const sequencesWithGaps = [];
      for (let sequence of freshSequence) {
        const requiredWaveforms = (freshState.sources || []).filter((source) => {
          if (source.id === sequence.id) {
            if (source.segment) {
              const segment = source.segment;
              return sequence.endTime > segment.start && sequence.startTime < segment.end;
            }
            return true;
          }
          return false;
        });
        if (requiredWaveforms.length > 1) {
          // We need to split.
          const toSplit = sequence;
          for (let i = 0; i < requiredWaveforms.length; i++) {
            const waveform = requiredWaveforms[i];
            const start = waveform.segment ? Math.max(toSplit.startTime, waveform.segment.start) : toSplit.startTime;
            const end = waveform.segment ? Math.min(toSplit.endTime, waveform.segment.end) : toSplit.endTime;
            sequencesWithGaps.push({
              ...toSplit,
              source: toSplit.id + '__' + start + '__' + end,
              startTime: start,
              endTime: end,
            });
          }
          continue;
        }
        sequencesWithGaps.push(sequence);
      }

      for (let sequence of sequencesWithGaps) {
        const waveform = (freshState.sources || []).find((r) => {
          const matches = r.id === sequence.id;
          if (matches) {
            if (r.segment) {
              return sequence.startTime >= r.segment.start && sequence.endTime <= r.segment.end;
            }
            return true;
          }
          return false;
        });

        const startTime = waveform.segment ? sequence.startTime - waveform.segment.start : sequence.startTime;
        const endTime = waveform.segment ? sequence.endTime - waveform.segment.start : sequence.endTime;
        const duration = endTime - startTime;
        if (duration <= 0) continue;

        if (waveform && waveform.data && freshState.dimensions.width) {
          let quality = freshState.quality;
          //
          // 1. Re-sample.
          const sequenceLengthSeconds = (endTime || waveform.data.duration) - (startTime || 0);
          const sequencePercent = sequenceLengthSeconds / freshState.duration;
          const visualWidth = freshState.dimensions.width * sequencePercent;
          const percentOfWaveformShown = Math.min(1, sequenceLengthSeconds / waveform.data.duration);
          const startPixel = (accumulator / freshState.duration) * freshState.dimensions.width;

          let newWidth = quality * visualWidth * (1 / percentOfWaveformShown);
          const newScale = Math.floor((waveform.data.duration * waveform.data.sample_rate) / newWidth);

          if (newScale < waveform.data.scale) {
            quality *= newScale / waveform.data.scale;
            newWidth = quality * visualWidth * (1 / percentOfWaveformShown);
            console.warn('Selected quality too high, or segment too small', { quality, newWidth });
          }

          try {
            const data = waveform.data.resample({ width: newWidth });
            // Unblock the thread.
            await new Promise((resolve) => setTimeout(resolve, 0));

            didChange = true;
            newSequence.push({
              ...sequence,
              waveform: {
                data,
                atWidth: visualWidth,
                startPixel,
                quality,
                segment: waveform.segment,
              },
            });
          } catch (e) {
            console.error(e);
          }
        } else {
          newSequence.push(sequence);
        }

        accumulator += endTime - startTime;
      }
      if (didChange) {
        setState({ sequence: newSequence });
      }
    },

    async setAttributes(props: WaveformPanelAttributes) {
      const promises: Promise<any>[] = [];
      const state: Partial<WaveformStoreState> = { isLoading: true };
      const loaders: Record<string, any> = {};
      const loaded = [];

      if (typeof props.duration !== 'undefined') {
        const duration = parseFloat(props.duration);
        if (!Number.isNaN(duration)) {
          state.duration = duration;
        }
      }

      if (typeof props['current-time'] !== 'undefined') {
        state.currentTime = Number(props['current-time']);
      }

      if (typeof props.srcset !== 'undefined') {
        // This is replacing... but it could be smarter.
        const srcset = parseSource(props.srcset);
        for (const src of srcset) {
          globalDeferredLoading[src.id] = globalDeferredLoading[src.id] ? globalDeferredLoading[src.id] : [];
          globalDeferredLoading[src.id].push(() => this.fetchWaveform(src.waveform));
        }

        state.sources = srcset;
      } else if (typeof props.src !== 'undefined') {
        const [waveform, id = waveform] = trimSplit(props.src, ' ');
        if (waveform) {
          state.sources = [{ id, waveform, data: null, duration: -1 }];
          promises.push(
            this.fetchWaveform(waveform).then((wave) => {
              setState((d) => {
                if (!d.duration) {
                  return { duration: wave.duration };
                }
                return {};
              });
            })
          );
        }
      }

      if (typeof props.quality !== 'undefined') {
        const quality = parseFloat(props.quality);
        if (quality && !Number.isNaN(quality)) {
          state.quality = quality;
        }
      }

      if (typeof props.sequence !== 'undefined') {
        const sequence: Array<{ id: string; source: string; startTime: number; endTime: number; waveform: null }> = [];
        const sequences = trimSplit(props.sequence, '|');
        // default#t=0,10|default#t=10,20
        let duration = 0;
        for (const seq of sequences) {
          const [url, time] = trimSplit(seq, '#t=');
          const [start, end] = trimSplit(time, ',');

          const loader = globalDeferredLoading[url];
          if (loader && !loaded.includes(url)) {
            loaded.push(url);
            promises.push(...loader.map((l) => l()));
            globalDeferredLoading[url] = null;
          }

          const startTime = parseFloat(start);
          const endTime = parseFloat(end);
          duration += endTime - startTime;
          sequence.push({
            startTime,
            endTime,
            id: url,
            source: seq.replace(/[#,:.\n]/g, '__').trim(),
            waveform: null,
          });
        }
        state.duration = duration;
        state.sequence = sequence;
      }

      setState(state);

      if (state.sources || state.sequence || state.quality) {
        await getState().resize();
      }

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
