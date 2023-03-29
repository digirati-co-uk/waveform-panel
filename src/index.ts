// Register web component.
//
//  <waveform-panel
//    src="./example.dat"
//  />
//
//  <waveform-panel
//    srcset="./example.dat canvas-1,./example-2.dat canvas-2"
//    sequence="canvas-1#t=0,10|canvas-2#t=0,20|canvas-1#t=10,20"
//    duration="40"
// />
//
// Outline:
// 1. Creates zustand store
// 2. Creates canvas element
// 3. Binds internal events
// 4. Send external events
//
// Characteristics
// - Global network cache for waveforms
// - Resolution based on alias (canvas id) OR waveform URL
// - Detects height periodically to ensure its correct internally
//
// External Interface
// - Clock method for syncing `$el.render(time: number);` (acts as loop for rendering) Also an attribute
// - Buffer method for sending buffered chunks `$el.buffer(TBC)`
// - Styling `$el.style({ vars... })`
// - Events:
//    - On change -> { time: number }
//    - On play
// - `$el.pause()` and `$el.play()` to change styles
// - $el.addEventListener('waveform-ready');
//
// Helpers / slices
// - draw(canvas: HTMLCanvasElement, internalState);
// - createTimeSlices(props: { src: string: srcset: string, sequence: string, duration: string }): TimeSlices[];
// - addBufferSection(TBC)
// - loadWaveform()
//
// Internal state
// - duration
// - time slices (source, start, end, targetStart, targetEnd)[]
// - currentTime
// - hoverTime
// - buffered chunks (start, end)[]
// - Waveform display TBC[] (generated from time slices + dimensions)
// - Dimensions (height/width/resolution)
//
// Task list
// - Create placeholder web component
// - Create zustand state object
// - Create mapping from attributes/properties to this state
// - Create empty render function that responds to attributes/properties
// - Create DOM + start rendering
// - Implement hover events that update state
// - Ensure derived state updates working
// - Ensure render code is correctly sampling (in console) the correct waveform and times
// - Pull in waveform library
// - Create sampling code for display
// - Create full render function without colours
// - Add more colours
// - Add buffering mechanisms

export * from './web-components/waveform-panel';

// @ts-ignore
if (typeof __GIT_TAG__ !== 'undefined') {
  // @ts-ignore
  console.log(`<waveform-panel /> version ${__GIT_TAG__}`);
}
