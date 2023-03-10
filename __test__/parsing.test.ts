import { parseSource } from '../src/attributes/source';

describe('Parsing', () => {
  test('it can parse', () => {
    const parsed = parseSource(`
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat first,
    https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x00001a.dat second,
  `);

    expect(parsed).toMatchInlineSnapshot(`
      [
        {
          "data": null,
          "id": "first",
          "waveform": "https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x000018.dat",
        },
        {
          "data": null,
          "id": "second",
          "waveform": "https://iiif-waveforms.s3.eu-west-2.amazonaws.com/vdc_100052359795.0x00001a.dat",
        },
      ]
    `);
  });
});
