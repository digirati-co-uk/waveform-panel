import { createWaveformStore, WaveformSequence, WaveformStore } from '../store';
import WaveformData from 'waveform-data';
import { scaleY } from '../helpers/scale-y';
import { makeSVGElement } from '../helpers/make-svg-element';

export interface WaveformPanelProps {
  src?: { waveform: string; id: string };
  srcset: Array<{ waveform: string; id: string }>;
  sequence: Array<{ id: string; startTime: number; endTime: number }>;
  duration: number;
  'current-time': number;
}

export type WaveformPanelAttributes = Partial<Record<keyof WaveformPanelProps, string>>;

export class WaveformPanel extends HTMLElement {
  store: WaveformStore;
  hasInitialised = false;
  initialAttributes: WaveformPanelAttributes = {};
  unsubscribe: () => void;
  invalidation = {
    dimensions: false,
    sequence: false,
  };
  container: HTMLDivElement;
  svg!: SVGElement;
  svgParts!: {
    mask: SVGMaskElement;
    waveforms: SVGGElement;
    maskBg: SVGRectElement;
    base: SVGRectElement;
    progress: SVGRectElement;
    hover: SVGRectElement;
    buffered: SVGGElement;
  };
  buffered?: Record<string, TimeRanges>;
  waveformCache: Record<string, WaveformData> = {};

  constructor() {
    super();

    this.container = document.createElement('div');
    this.attachShadow({ mode: 'open' }).appendChild(this.container);
    const style = document.createElement('style');
    // language=CSS
    style.innerHTML = `
      :host {
        display: block;
        --waveform-background: #000;
        --waveform-base: #8a9aa1;
        --waveform-hover: #14a4c3;
        --waveform-buffered: #fff;
        --waveform-progress: rgba(255, 255, 255, .4);
      }
      
      svg {
        background: var(--waveform-background, #000);
      }
      svg rect.hover {
          fill: var(--waveform-hover, #14a4c3);
      }
      svg rect.base {
          fill: var(--waveform-base, #8a9aa1);
      }
      svg rect.progress {
          fill: var(--waveform-progress, #14a4c3);
      }
      svg .buffered rect {
          fill: var(--waveform-buffered, #fff);
      }
    `;
    this.shadowRoot.appendChild(style);

    window.addEventListener('resize', this.resize);

    this.store = createWaveformStore({} as any);

    this.createEmptySVG();
    this.container.appendChild(this.svg);

    const render = this.render.bind(this);
    this.unsubscribe = this.store.subscribe((state, prevState) => {
      if (state.sequence !== prevState.sequence) {
        this.invalidation.sequence = true;
      }

      if (state.dimensions !== prevState.dimensions) {
        this.invalidation.dimensions = true;
      }

      requestAnimationFrame(render);
    });
  }

  set currentTime(currentTime: number) {
    this.store.setState({ currentTime });
  }

  get currentTime() {
    return this.store.getState().currentTime;
  }

  get duration() {
    return this.store.getState().duration;
  }

  lastBufferedStarts = [];

  reseek(buffered?: Record<string, TimeRanges>) {
    if (buffered) {
      this.buffered = buffered;
    }
    if (this.buffered) {
      // go through each sequence.
      // figure out what parts of THAT sequence are buffered
      // add those to the rect
      // const newStarts = [];
      // for (let i = 0; i < this.buffered.length; i++) {
      //   const start = buffered.start(i);
      //   const end = buffered.end(i);
      //   newStarts.push(start);
      //   const found = this.svgParts.buffered.querySelector(`[data-buffer-start="${start}"]`);
      //   if (found) {
      //     // Update found
      //   } else {
      //     makeSVGElement('rect', {
      //       height: '100%',
      //       width: '???',
      //       'data-buffer-start': `${start}`,
      //     });
      //     // Create new
      //   }
      // }
      //
      // const toRemove = this.lastBufferedStarts.filter((x) => !newStarts.includes(x));
      // for (const start of toRemove) {
      //   const found = this.svgParts.buffered.querySelector(`[data-buffer-start="${start}"]`);
      //   if (found) {
      //     this.svgParts.buffered.removeChild(found);
      //   }
      // }
      // for (const el of Array.from(this.svgParts.buffered.children)) {
      //
      // }
      // Create SVGs.
    }
  }

  createEmptySVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.style.background = `var(--waveform-background, #000)`;

    this.svgParts = {
      mask: makeSVGElement('mask', { id: 'waveform' }),
      waveforms: makeSVGElement('g', {
        class: 'waveforms',
      }),
      maskBg: makeSVGElement('rect', {
        x: '0',
        y: '0',
        width: `${this.store.getState().dimensions.width}px`,
        height: `100%`,
        fill: '#000',
      }),
      base: makeSVGElement('rect', {
        class: 'base',
        mask: 'url(#waveform)',
        x: '0px',
        y: '0px',
        width: `100%`,
        height: `100%`,
      }),
      progress: makeSVGElement('rect', {
        class: 'progress',
        mask: 'url(#waveform)',
        x: '0px',
        y: '0px',
        width: `0px`,
        height: `100%`,
      }),
      hover: makeSVGElement('rect', {
        class: 'hover',
        mask: 'url(#waveform)',
        x: '0px',
        y: '0px',
        height: `100%`,
      }),
      buffered: makeSVGElement('g', {
        class: 'buffered',
      }),
    };

    // The structure.
    // <svg>
    //  <defs>
    //    <mask id="waveform">
    //      <rect x="0" y="0" width="{width}" height="{height}" fill="#000 />
    //      <g>
    //        <polygon points="{...}" fill="#fff" />
    //        <polygon points="{...}" fill="#fff" />
    //      </g>
    //    </mask>
    //  </defs>
    //  <rect mask="url(#waveform)" x="..." y="..." width="..." height="..." style="fill: var(--waveform-base)">
    //  <rect mask="url(#waveform)" x="..." y="..." width="..." height="..." style="fill: var(--waveform-progress)">
    //  <rect mask="url(#waveform)" x="..." y="..." width="..." height="..." style="fill: var(--waveform-hover)">
    //  <g>
    //    <rect mask="url(#waveform)" x="..." y="..." width="..." height="..." style="fill: var(--waveform-buffered)">
    //    <rect mask="url(#waveform)" x="..." y="..." width="..." height="..." style="fill: var(--waveform-buffered)">
    //  </g>
    // </svg>

    this.svgParts.mask.appendChild(this.svgParts.maskBg);
    this.svgParts.mask.appendChild(this.svgParts.waveforms);
    const defs = makeSVGElement('defs', {});
    defs.appendChild(this.svgParts.mask);

    this.svg.appendChild(defs);
    this.svg.appendChild(this.svgParts.base);
    this.svg.appendChild(this.svgParts.buffered);
    this.svg.appendChild(this.svgParts.hover);
    this.svg.appendChild(this.svgParts.progress);
  }

  resizeSVG() {
    const dimensions = this.store.getState().dimensions;

    this.svgParts.waveforms.setAttributeNS(null, 'x', `-${this.store.getState().dimensions.height / 2}px`);
    this.svgParts.maskBg.setAttributeNS(null, 'width', `${dimensions.width}px`);
    this.svgParts.base.setAttributeNS(null, 'height', `${dimensions.height}px`);
    this.svgParts.progress.setAttributeNS(null, 'height', `${dimensions.height}px`);
    this.svgParts.hover.setAttributeNS(null, 'height', `${dimensions.height}px`);
  }

  addSequenceToSVG(sequence: WaveformSequence) {
    if (!sequence.waveform) {
      // Probably loading..
      return;
    }
    // Is this already added?
    const existing = this.svgParts.waveforms.querySelector(`[data-sequence="${sequence.source}"]`);

    const waveform = sequence.waveform.data;
    const channel = waveform.channel(0);

    const h = this.store.getState().dimensions.height * 1.5;
    const points = [];
    for (let x = 0; x < waveform.length - 1; x++) {
      const val = channel.max_sample(x);
      points.push([sequence.waveform.startPixel + x + 0.5, scaleY(val, h) + 0.5]);
    }

    for (let x = waveform.length - 1; x >= 0; x--) {
      const val = channel.min_sample(x);
      points.push([sequence.waveform.startPixel + x + 0.5, scaleY(val, h) + 0.5]);
    }

    const mappedPoints = points.map((p) => p.join(',')).join(' ');
    if (existing) {
      existing.setAttributeNS(null, 'points', mappedPoints);
    } else {
      const polygon = makeSVGElement('polygon', {
        points: mappedPoints,
        fill: '#fff',
        'data-sequence': sequence.source,
      });
      this.svgParts.waveforms.appendChild(polygon);
    }
  }

  removeSequenceFromSVG(id: string) {
    // @todo use this..
    const existing = this.svgParts.waveforms.querySelector(`[data-sequence="${id}"]`);
    if (existing) {
      existing.parentNode?.removeChild(existing);
    }
  }

  render() {
    const { isLoading, sources, currentTime, sequence, dimensions, hoverTime, duration, mouse } = this.store.getState();

    if (this.invalidation.dimensions) {
      this.resizeSVG();
      this.reseek();
      this.invalidation.dimensions = false;
    }

    if (this.invalidation.sequence) {
      for (const seq of sequence) {
        this.addSequenceToSVG(seq);
      }

      this.invalidation.sequence = false;
    }

    // Update SVG:
    //  - Update current time
    //  - Update hover style

    if (isLoading) {
      // @todo loading...
      return;
    }

    const hoverX = mouse.isHover ? Math.abs(~~((dimensions.width / duration) * hoverTime)) : 0;

    // @todo make this configurable (sub pixel)
    const current = Math.abs(~~((dimensions.width / duration) * currentTime));

    this.svgParts.hover.setAttributeNS(null, 'width', `${hoverX}px`);
    this.svgParts.base.setAttributeNS(null, 'x', `${hoverX}px`);
    this.svgParts.progress.setAttributeNS(null, 'width', `${current}px`);

    // @todo render buffered.
  }

  static get observedAttributes(): Array<keyof WaveformPanelAttributes> {
    return ['src', 'srcset', 'duration', 'sequence', 'current-time'];
  }

  resize = () => {
    const box = this.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    this.store.getState().setDimensions(box, dpi);

    const { width, height } = this.container.getBoundingClientRect();

    this.svg.setAttributeNS(null, 'height', `${height}px`);
    this.svg.setAttributeNS(null, 'width', `100%`);
    this.svg.setAttributeNS(null, 'preserveAspectRatio', `none`);
    this.svg.setAttributeNS(null, 'viewBox', `0 ${height / 2.5} ${width} ${height / 1.5}`);
  };

  // Web component life-cycle.
  connectedCallback() {
    if (this.isConnected) {
      this.store
        .getState()
        .setAttributes(this.initialAttributes)
        .then(() => {
          //
        });
      this.initialAttributes = {};
      this.hasInitialised = true;
      this.resize();

      this.addEventListener('click', (e) => {
        e.preventDefault();

        const { dimensions } = this.store.getState();
        const target = { x: e.pageX - dimensions.pageX, y: e.pageY - dimensions.pageY };
        this.store.setState((state) => {
          const percent = Math.abs(target.x) / state.dimensions.width;
          const time = state.duration * percent;

          let t = 0;
          let currentSequence;
          for (const seq of state.sequence) {
            currentSequence = seq;
            if (time < t + seq.endTime - seq.startTime) {
              break;
            }
            t += seq.endTime - seq.startTime;
          }

          const shouldUpdate = this.dispatchEvent(
            new CustomEvent('click-waveform', {
              detail: { time, percent, target, currentSequence, sequenceTime: time - t },
              cancelable: true,
              bubbles: true,
            })
          );

          if (!shouldUpdate) {
            return {};
          }

          this.setAttribute('current-time', `${time}`);

          return {
            currentTime: time,
          };
        });
      });

      // Mouse move event.
      this.addEventListener('mousemove', (e) => {
        const { dimensions } = this.store.getState();
        const target = { x: e.pageX - dimensions.pageX, y: e.pageY - dimensions.pageY };
        this.store.setState((state) => {
          const percent = Math.abs(target.x) / state.dimensions.width;
          const time = state.duration * percent;
          return {
            hoverTime: time,
          };
        });
      });

      // Mouse in
      this.addEventListener('pointerenter', (e) => {
        this.store.setState((s) => ({
          mouse: { ...s.mouse, isHover: true },
        }));
      });

      // Mouse out
      this.addEventListener('pointerleave', (e) => {
        this.store.setState((s) => ({
          mouse: { ...s.mouse, isHover: false },
        }));
      });

      this.addEventListener('pointerdown', (e) => {
        this.store.setState((s) => ({
          mouse: { ...s.mouse, isActive: true },
        }));
      });

      this.addEventListener('pointerup', (e) => {
        this.store.setState((s) => ({
          mouse: { ...s.mouse, isActive: false },
        }));
      });
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.hasInitialised) {
      this.store
        .getState()
        .setAttributes({ [name]: newValue })
        .then(() => {
          //
        });
    } else {
      this.initialAttributes[name] = newValue;
    }
  }

  disconnectedCallback() {
    this.unsubscribe();
    window.removeEventListener('resize', this.resize);
  }
}

customElements.define('waveform-panel', WaveformPanel);
