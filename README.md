# Waveform panel

<img src="https://gist.githubusercontent.com/stephenwf/c8d727a69a2c5d958298c6621b95c4c9/raw/caa0d6c1e47f693a1fc1a9b2c14d9c38152688ab/waveform.svg" />

A web component that can display simple waveforms or compositions and crops of multiple waveforms. It uses SVG to render
the waveforms, with CSS variables for customising styling. It is interactive when hovering by default with simple
events for scrubbing.

- [Waveform panel](#waveform-panel)
    * [Installation](#installation)
    * [Web Component](#web-component)
        - [Using the `src` attribute](#using-the--src--attribute)
        - [Using the `sequences` attribute](#using-the--sequences--attribute)
        - [Multiple sequences](#multiple-sequences)
        - [Multiple sources](#multiple-sources)
        - [Multiple sources + sequences](#multiple-sources---sequences)
        - [Updating current time](#updating-current-time)
    * [Events](#events)
    * [Buffering + `<audio />` component](#buffering-----audio-----component)
    * [Styling](#styling)

## Installation
```bash
npm i waveform-panel
```

or yarn
```bash
yarn add waveform-panel
```

and import somewhere in your bundle:
```js
import 'waveform-panel';
```

or you can drop the script into any HTML page:
```html
<script src="https://cdn.jsdelivr.net/npm/waveform-panel/dist/index.umd.js"></script>
```


## Web Component

You will first need a generated waveform to get started. You can read more about this at https://waveform.prototyping.bbc.co.uk/

> **waveform-data.js** is part of a [BBC R&D Browser-based audio waveform visualisation software family](https://waveform.prototyping.bbc.co.uk):
>
> - [audiowaveform](https://github.com/bbc/audiowaveform): C++ program that generates waveform data files from MP3 or WAV format audio.
> - [audio_waveform-ruby](https://github.com/bbc/audio_waveform-ruby): A Ruby gem that can read and write waveform data files.
> - **waveform-data.js**: JavaScript library that provides access to precomputed waveform data files, or can generate waveform data using the Web Audio API.
> - [peaks.js](https://github.com/bbc/peaks.js): JavaScript UI component for interacting with waveforms.

Extract from [bbc/waveform-data.js](https://github.com/bbc/waveform-data.js).


Once you have hosted your `.dat` files from this process, and you have the JS bundle for waveform-panel, you can 
use the web component in your application. (Examples provided by [The British Library](https://github.com/britishlibrary))

#### Using the `src` attribute
```html
<waveform-panel src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat"></waveform-panel>
```

You can also provide a duration, although this will be extracted from the loaded waveform.
```html
<waveform-panel 
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat"
  duration="3723.4"
></waveform-panel>
```

#### Using the `sequences` attribute

The sequence attribute allows you to add a Media Frag selector to a waveform.

```html
<waveform-panel
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat"
  sequence="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat#t=100,1300"
></waveform-panel>
```

When you provide a `src` you can also provide an identifier. This could be the Audio resource, or just an internal
identifier that you can use. By default, the URL of the waveform will be the identifier. This identifier should then
be used in the `sequence=""` attribute. This identifier will also available in [events](#events).

```html
<waveform-panel
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat my-identifier"
  sequence="my-identifier#t=100,1300"
></waveform-panel>
```

**Identifiers can also be URLs, like a IIIF Canvas** - allowing for some basic interoperability with Media Frags used in IIIF Presentation 3 Manifests for AV content.
```html
<waveform-panel
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat https://api.bl.uk/metadata/iiif/ark:/81055/vdc_100052359795.0x000004"
  sequence="https://api.bl.uk/metadata/iiif/ark:/81055/vdc_100052359795.0x000004#t=100,1300"
></waveform-panel>
```
For the rest of the demos - shorter identifiers will be used for clarity.


#### Multiple sequences

You can chain multiple sequences together by using `|` between them.
```html
<waveform-panel
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat first"
  sequence="first#t=100,200 | first#t=200,500"
></waveform-panel>
```

#### Multiple sources
In addition to `src=""` you can also provide multiple waveforms using the `srcset=""` property.

Each source is structured as follows:
```
[waveform-url] [identifier], [waveform-url] [identifier]
```
With spaces to add an identifier after each, and a comma `,` (or pipe `|`) separating sources.

```html
<waveform-panel
  srcset="
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat first,
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x00001a.dat second,
  "
></waveform-panel>
```
_**Note**: Line breaks are valid, and added for readability._

You can also optionally have a single `[identifier]` made up of multiple waveforms. This will internally
split the sequence into two distinct sections - but might be closer to the original data modelled.

If you are using targets, the structure changes to be:
```
[waveform-url] [identifier]#t=[start],[end] | [waveform-url] [identifier]#t=[start],[end]
```
With spaces to add an identifier with target and only pipes `|` to separate sources.

```html
<waveform-panel
  srcset="
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat first#t=0,50   |
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x00001a.dat first#t=50,100 | 
  "
></waveform-panel>
```

_**Note**: you have to use a pipe `|` to split sequences if you include `#t=` selectors._ 

#### Multiple sources + sequences

You can also create a more complex sequence using `srcset=""` and `sequences=""` together.
```html
<waveform-panel
  srcset="
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat first,
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x00001a.dat second,
  "
  sequence="
    first#t=0,100   |
    first#t=100,200 |
    second#t=0,400
  "
></waveform-panel>
```

This will use the sequence to build a single waveform from multiple sources. Currently, the amplitude is calculated
independently for each input - so a quiet source and relatively loud source together will not clearly reflect this difference.  

#### Updating current time

You can pass in a `current-time=""` initially to set the time of the component. You can also update this programmatically from javascript as an audio source is playing, for example.
```html
<waveform-panel
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat"
  current-time="200"
></waveform-panel>
```

This will be reflected in the UI.

## Events

There is currently only one event that you can listen to: `click-waveform`. This is dispatched when the waveform is clicked at a specific time.
```html

<waveform-panel
  id="waveform"
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat"
  current-time="200"
></waveform-panel>

<script>
  const $waveform = document.getElementById('waveform');
  $waveform.addEventListener('click-waveform', e => {
    e.preventDefault(); // Prevent the waveform automatically seeking.
    connsole.log(e.detail.time); // Time relative to whole waveform
    connsole.log(e.detail.sequenceTime); // Time relative to current sequence
  });
</script>
```

It will return some information in the `event.detail` property you can use to drive other UIs or `<audio/>` elements. Annotated example below:
```js
const detail = {
  // Details of the sequence clicked.
  currentSequence: {
    // The start and end times of that sequence.
    startTime: 0, 
    endTime: 3723.4, 
    id: 'https://api.bl.uk/metadata/iiif/ark:/81055/vdc_100052359795.0x000004',
    // Internal identifier.
    source: 'https__//api__bl__uk/metadata/iiif/ark__/81055/vdc_100052359795__0x000004__t=0__3723__4__',
    // The waveform data
    waveform: {
      atWidth: 884.5, // The width that the waveform is displayed at
      data: {} // Omitted, but the full raw waveform (resampled down to the width)
      startPixel: 0, // where across the waveform this starts.
    }
  },
  // Time relative to the whole waveform.
  time: 2635.215828151498,
  // Percent through the whole waveform
  percent: 0.35387224420576596,
  // Time relative to the individual sequence.
  sequenceTime: 2635.215828151498,
  // Where on the waveform clicked.
  target: {x: 626, y: 95},
};
```

## Buffering + `<audio />` component
Note: this is currently still under development.

```html
<waveform-panel
  id="waveform"
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat my-audio"
  current-time="200"
></waveform-panel>

<audio id="audio" src="https://example.org/audio.m4a"></audio>

<script>
  const $waveform = document.getElementById('waveform');
  const $audio = document.getElementById('audio');

  // Syncing the current time
  audio.addEventListener('timeupdate', () => {
    // note: at the moment you need to calculate the current time from your audio source.
    $waveform.currentTime = audio.currentTime;
    
    // Possible future API:
    // $waveform.updateSequencedTime({
    //   'my-audio': audio.currentTime,
    // })
  });
  
  // Example click interaction (play on click - otherwise seek)
  $waveform.addEventListener('click-waveform', (e) => {
    if ($audio.paused) {
      e.preventDefault(); // Prevent seeking.
      $audio.play();
    } else {
      $audio.currentTime = e.detail.sequenceTime;
    }
  })

  // Adding buffering visualisation (WIP)
  audio.addEventListener('progress', () => {
    // Updates the buffered audio. 
    // You need to specify the identifier of the waveform and bind to a TimeRange
    $waveform.reseek({
      'my-audio': audio.buffered
    });
  });
  
</script>
```

## Styling

You can control the following styles using CSS variables, and target like a normal HTML element
```css
waveform-panel {
  --waveform-background: #000;
  --waveform-base: #8a9aa1;
  --waveform-hover: #14a4c3;
  --waveform-buffered: #fff;
  --waveform-progress: rgba(255, 255, 255, .4);
}
```

Example light theme:
```css
waveform-panel.light-waveform {
  --waveform-background: #eee;
  --waveform-base: #8a9aa1;
  --waveform-hover: #14a4c3;
  --waveform-buffered: #bbd5de;
  --waveform-progress: rgba(0, 0, 0, .2);
}
```

Usage with class:
```html
<waveform-panel
  class="light-waveform"
  src="https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat"
></waveform-panel>
```
