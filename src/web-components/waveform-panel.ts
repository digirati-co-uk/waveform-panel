import { createWaveformStore, WaveformSequence, WaveformStore, WaveformStoreState } from '../store';
import { parseWaveform } from '../helpers/parse-waveform';
import WaveformData from 'waveform-data';
import { trimSplit } from '../helpers/trim-spit';
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
  waveformCache: Record<string, WaveformData> = {};

  constructor() {
    super();

    this.container = document.createElement('div');
    this.attachShadow({ mode: 'open' }).appendChild(this.container);
    const style = document.createElement('style');
    // language=CSS
    style.innerHTML = `
      :host {
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

    // @todo This did not work..
    // const { width, height } = this.getBoundingClientRect();
    // const observer = new ResizeObserver(entries => {
    //   for (const entry of entries) {
    //     const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
    //     console.log({ contentBoxSize });
    //   }
    //   console.log('changed?');
    // })
    //
    // observer.observe(this);

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
        height: `100%`, // TODO HARDCODED height
      }),
      progress: makeSVGElement('rect', {
        class: 'progress',
        mask: 'url(#waveform)',
        x: '0px',
        y: '0px',
        width: `0px`,
        height: `200px`, // TODO HARDCODED height
      }),
      hover: makeSVGElement('rect', {
        class: 'hover',
        mask: 'url(#waveform)',
        x: '0px',
        y: '0px',
        height: `200px`, // TODO HARDCODED height
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
    const existing = this.svgParts.waveforms.querySelector(`[data-sequence="${sequence.id}"]`);

    const waveform = sequence.waveform.data;
    const channel = waveform.channel(0);
    const x = `${sequence.waveform.startPixel || 0}px`;

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
      // existing.setAttributeNS(null, 'x', x);
    } else {
      const polygon = makeSVGElement('polygon', {
        points: mappedPoints,
        fill: '#fff',
        // style: `transform: translateX(${x})`,
        'data-sequence': sequence.id,
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
      this.invalidation.dimensions = false;
    }

    if (this.invalidation.sequence) {
      console.log('Invalidation of sequence');

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

    // console.log('render ->', this.store.getState());
    const hoverX = mouse.isHover ? Math.abs(~~((dimensions.width / duration) * hoverTime)) : 0;
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
          console.log('initial store ->', this.store.getState());
        });
      this.initialAttributes = {};
      this.hasInitialised = true;
      this.resize();

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
          console.log('attributes set.', this.store.getState());
        });
    } else {
      this.initialAttributes[name] = newValue;
    }
  }

  disconnectedCallback() {
    this.unsubscribe();
    window.removeEventListener('resize', this.resize);
  }

  adoptedCallback() {
    console.log('element moved to new page.');
  }
}

customElements.define('waveform-panel', WaveformPanel);