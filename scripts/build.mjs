import { defineConfig } from './base-config.mjs';
import { build } from 'vite';
import chalk from 'chalk';
import { execa } from 'execa';

(async () => {

  const DIST = 'dist';

  // Main UMD build.
  buildMsg('UMD');
  await build(
    defineConfig({
      entry: `src/index.ts`,
      name: 'index',
      outDir: DIST,
      globalName: 'WaveformPanel',
    })
  );

  buildMsg('ESM Build');
  await build(
    defineConfig({
      entry: `src/index.ts`,
      name: 'index',
      outDir: `${DIST}/bundle`,
    })
  );

  buildMsg('Standalone module')
  await build(
    defineConfig({
      entry: `src/index.ts`,
      name: 'index',
      outDir: `${DIST}/standalone`,
      external: ['waveform-data', 'zustand/vanilla'],
    })
  );

  buildMsg('Types');

  listItem('waveform-panel');
  await execa('./node_modules/.bin/dts-bundle-generator', [`--out-file=${DIST}/index.d.ts`, './src/index.ts'])



  function buildMsg(name) {
    console.log(chalk.grey(`\n\nBuilding ${chalk.blue(name)}\n`));
  }
  function listItem(name) {
    console.log(chalk.gray(`- ${chalk.green(name)}`));
  }
})();
