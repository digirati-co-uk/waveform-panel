import { createWaveformStore, WaveformSequence, WaveformStore } from '../store';
import WaveformData from 'waveform-data';
import { scaleY } from '../helpers/scale-y';
import { makeSVGElement } from '../helpers/make-svg-element';

export interface WaveformPanelProps {
  src?: { waveform: string; id: string };
  srcset: Array<{ waveform: string; id: string }>;
  sequence: Array<{ id: string; startTime: number; endTime: number }>;
  duration: number;
  quality: number;
  resize: 'true' | 'false';
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
  svg!: SVGElement;
  svgParts!: {
    loading: SVGRectElement;
    mask: SVGMaskElement;
    waveforms: SVGGElement;
    maskBg: SVGRectElement;
    base: SVGRectElement;
    progress: SVGRectElement;
    hover: SVGRectElement;
    buffered: SVGGElement;
    line: SVGGElement;
  };
  buffered?: Record<string, TimeRanges>;
  waveformCache: Record<string, WaveformData> = {};

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
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

        svg .waveforms {
            transition: opacity 140ms;
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

        svg .loading {
            translate: 0px -0.5px;
        }
    `;

    this.store = createWaveformStore({} as any);

    this.createEmptySVG();
    this.shadowRoot.appendChild(this.svg);
    this.shadowRoot.appendChild(style);

    const render = this.render.bind(this);
    this.unsubscribe = this.store.subscribe((state, prevState) => {
      if (state.sequence !== prevState.sequence) {
        this.invalidation.sequence = true;
      }

      if (state.isLoading !== prevState.isLoading) {
        this.setIsLoading(state.isLoading);
      }
      if (state.loadingProgress !== prevState.loadingProgress) {
        if (this.svgParts.loading) {
          this.svgParts.loading.style.width = `${state.loadingProgress * 100}%`;
        }
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

  get quality() {
    return this.store.getState().quality;
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

    const randomId = (Math.random() + 1).toString(36).substring(2);

    this.svgParts = {
      loading: makeSVGElement('rect', {
        x: '0',
        y: '50%',
        width: '',
        height: '1',
        fill: '#fff',
        class: 'loading',
      }),
      mask: makeSVGElement('mask', { id: 'waveform-' + randomId }),
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
        mask: 'url(#waveform-' + randomId + ')',
        x: '0px',
        y: '0px',
        width: `100%`,
        height: `100%`,
      }),
      progress: makeSVGElement('rect', {
        class: 'progress',
        mask: 'url(#waveform-' + randomId + ')',
        x: '0px',
        y: '0px',
        width: `0px`,
        height: `100%`,
      }),
      hover: makeSVGElement('rect', {
        class: 'hover',
        mask: 'url(#waveform-' + randomId + ')',
        x: '0px',
        y: '0px',
        height: `100%`,
      }),
      buffered: makeSVGElement('g', {
        class: 'buffered',
      }),
      line: makeSVGElement('line', {
        class: 'waveform-line',
        x1: '0px',
        stroke: '#999',
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
    this.svgParts.waveforms.appendChild(this.svgParts.line);
    const defs = makeSVGElement('defs', {});
    defs.appendChild(this.svgParts.mask);

    this.svg.appendChild(defs);
    this.svg.appendChild(this.svgParts.base);
    this.svg.appendChild(this.svgParts.buffered);
    this.svg.appendChild(this.svgParts.hover);
    this.svg.appendChild(this.svgParts.progress);
    this.svg.appendChild(this.svgParts.loading);
  }

  resizeSVG() {
    const dimensions = this.store.getState().dimensions;

    // this.svgParts.waveforms.setAttributeNS(null, 'x', `-${this.store.getState().dimensions.height / 2}px`);
    this.svgParts.maskBg.setAttributeNS(null, 'width', `${dimensions.width}px`);
    this.svgParts.base.setAttributeNS(null, 'height', `${dimensions.height}px`);
    this.svgParts.progress.setAttributeNS(null, 'height', `${dimensions.height}px`);
    this.svgParts.hover.setAttributeNS(null, 'height', `${dimensions.height}px`);

    this.svgParts.line.setAttributeNS(null, 'x2', `${dimensions.width}px`);
    this.svgParts.line.setAttributeNS(null, 'y1', `${dimensions.height / 2}px`);
    this.svgParts.line.setAttributeNS(null, 'y2', `${dimensions.height / 2}px`);
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
    const startTime = sequence.waveform.segment
      ? sequence.startTime - sequence.waveform.segment.start
      : sequence.startTime;
    let endTime = sequence.waveform.segment ? sequence.endTime - sequence.waveform.segment.start : sequence.endTime;
    if (endTime > waveform.duration) {
      console.warn('Data does not match waveform duration', { overflow: endTime - waveform.duration });
      endTime = waveform.duration - 0.01;
    }

    const start = ~~(waveform.pixels_per_second * startTime);
    const duration = ~~(waveform.pixels_per_second * (endTime - startTime));
    const end = start + duration;

    const h = this.store.getState().dimensions.height;
    const points = [];
    let didError = false;
    let lastError;
    const maxSamples = [];
    const minSamples = [];

    for (let x = start; x < end; x++) {
      try {
        const max = channel.max_sample(x);
        if (Number.isSafeInteger(max)) {
          maxSamples[x] = max;
        }
      } catch (e) {
        lastError = e;
        didError = true;
      }
    }

    for (let x = end; x >= start; x--) {
      try {
        const min = channel.min_sample(x);
        if (Number.isSafeInteger(min)) {
          minSamples[x] = min;
        }
      } catch (e) {
        lastError = e;
        didError = true;
      }
    }

    if (maxSamples.length === 0 || minSamples.length === 0) {
      return;
    }

    const maxFactor = Math.max(0, ...maxSamples.filter((t) => typeof t !== 'undefined')) * 2.5;
    const minFactor = Math.abs(Math.min(...minSamples.filter((t) => typeof t !== 'undefined'))) * 2.5;

    for (let x = start; x < end; x++) {
      const val = maxSamples[x];
      if (typeof val !== 'undefined') {
        const _x = (x - start) / (sequence.waveform.quality || 1);
        points.push([sequence.waveform.startPixel + (_x === 0 ? -2 : _x + 0.5), scaleY(val, h, maxFactor + 1) + 0.5]);
      }
    }

    for (let x = end; x >= start; x--) {
      const val = minSamples[x];
      if (typeof val !== 'undefined') {
        const _x = (x - start) / (sequence.waveform.quality || 1);
        points.push([sequence.waveform.startPixel + (_x === 0 ? -2 : _x + 0.5), scaleY(val, h, minFactor + 1) + 0.5]);
      }
    }

    if (didError) {
      if (lastError) {
        console.error(lastError);
      }
      console.error('Error rendering waveform', channel, sequence);
      console.log('Debug component', this.outerHTML);
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
      const newSources = sequence.map((s) => s.source);
      for (const existing of [...this.svgParts.waveforms.children]) {
        const seq = (existing as any).getAttribute('data-sequence');
        if (!newSources.includes(seq)) {
          this.removeSequenceFromSVG(seq);
        }
      }

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
    return ['src', 'srcset', 'duration', 'quality', 'sequence', 'current-time', 'resize'];
  }

  lastWidth = -1;
  lastHeight = -1;
  resizeTimout = -1;
  requeueResize = false;

  resize = () => {
    if (this.resizeTimout === -1) {
      this.resizeTimout = setTimeout(this.forceResize, 0) as any;
    }
  };
  isAlreadyResizing = false;

  forceResize = () => {
    this.resizeTimout = -1;

    const box = this.getBoundingClientRect();
    const dpi = window.devicePixelRatio || 1;
    this.store.getState().setDimensions(box, dpi);

    const { width, height } = this.getBoundingClientRect();

    this.lastWidth = width;
    this.lastHeight = height;

    this.svg.setAttributeNS(null, 'height', `${height}px`);
    this.svg.setAttributeNS(null, 'width', `100%`);
    this.svg.setAttributeNS(null, 'preserveAspectRatio', `none`);
    this.svg.setAttributeNS(null, 'viewBox', `0 0 ${width} ${height}`);

    if (this.hasInitialised) {
      if (this.isAlreadyResizing) {
        this.requeueResize = true;
        return;
      }

      this.isAlreadyResizing = true;

      this.setIsLoading(true);

      this.store
        .getState()
        .resize(() => this.requeueResize)
        .then(() => {
          this.setIsLoading(false);
          this.resizeTimout = -1;
          this.isAlreadyResizing = false;
          if (this.requeueResize) {
            this.resize();
            this.requeueResize = false;
          }
        });
    }
  };

  setIsLoading(isLoading) {
    this.svgParts.waveforms.style.opacity = `${isLoading ? 0 : 1}`;
  }

  // Web component life-cycle.
  connectedCallback() {
    if (this.isConnected) {
      if (this.initialAttributes['resize'] === 'true') {
        this.windowEvent = true;
        window.addEventListener('resize', this.resize);
      }

      this.store
        .getState()
        .setAttributes(this.initialAttributes, true, () => false)
        .then(() => {
          //
        });
      this.initialAttributes = {};
      this.resize();
      this.hasInitialised = true;

      const lastTarget = { x: 0, y: 0, moved: false };

      this.addEventListener('touchstart', (e) => {
        e.preventDefault();

        const { dimensions } = this.store.getState();
        this.store.setState({ pointer: { isDown: true } });
        lastTarget.x = e.touches[0].pageX - dimensions.pageX;
        lastTarget.y = e.touches[0].pageY - dimensions.pageY;

        this.store.getState().setHover(lastTarget.x);
      });

      this.addEventListener('touchmove', (e) => {
        if (this.store.getState().pointer.isDown && e.touches.length) {
          e.preventDefault();

          const { dimensions } = this.store.getState();
          lastTarget.x = e.touches[0].pageX - dimensions.pageX;
          lastTarget.y = e.touches[0].pageY - dimensions.pageY;
          lastTarget.moved = true;

          this.store.getState().setHover(lastTarget.x);
        }
      });

      this.addEventListener('touchend', (e) => {
        e.preventDefault();

        if (this.store.getState().pointer.isDown) {
          this.store.setState({ pointer: { isDown: false } });
          // this.moveToPoint(lastTarget, !lastTarget.moved);
          this.moveToPoint(lastTarget, true);
          lastTarget.moved = false;
        }
      });

      this.addEventListener('click', (e) => {
        e.preventDefault();

        const { dimensions } = this.store.getState();
        const target = { x: e.pageX - dimensions.pageX, y: e.pageY - dimensions.pageY };
        this.moveToPoint(target, true);
      });

      // Mouse move event.
      this.addEventListener('mousemove', (e) => {
        const { dimensions } = this.store.getState();
        const target = { x: e.pageX - dimensions.pageX, y: e.pageY - dimensions.pageY };
        this.store.getState().setHover(target.x);
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

  moveToPoint(target: { x: number; y: number }, isClick = false) {
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

      if (isClick) {
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
      }

      this.setAttribute('current-time', `${time}`);

      return {
        currentTime: time,
      };
    });
  }

  attributeQueue: WaveformPanelAttributes = {};
  attributeTimeout = -1;
  isAlreadyUpdating = false;
  requeueUpdate = false;
  windowEvent = false;

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.hasInitialised) {
      this.attributeQueue[name] = newValue;
      this.queueUpdate();
    } else {
      this.initialAttributes[name] = newValue;
    }
  }

  queueUpdate() {
    if (this.attributeTimeout === -1) {
      this.attributeTimeout = setTimeout(this.updateAttributes.bind(this), 10) as any;
    }
    this.requeueUpdate = false;
  }

  updateAttributes() {
    this.attributeTimeout = -1;
    if (this.isAlreadyUpdating) {
      this.requeueUpdate = true;
      return;
    }
    if (this.hasInitialised) {
      this.isAlreadyUpdating = true;
      this.setIsLoading(true);
      this.store
        .getState()
        .setAttributes(this.attributeQueue, false, () => this.requeueUpdate)
        .then(() => {
          this.setIsLoading(false);
          this.isAlreadyUpdating = false;
          if (this.requeueUpdate) {
            this.queueUpdate();
          }
        });
      this.attributeQueue = {};
    }
  }

  disconnectedCallback() {
    this.unsubscribe();
    if (this.windowEvent) {
      window.removeEventListener('resize', this.resize);
    }
  }
}

customElements.define('waveform-panel', WaveformPanel);
