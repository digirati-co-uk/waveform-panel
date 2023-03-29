import { defineConfig } from './base-config.mjs';
import { build } from 'vite';
import chalk from 'chalk';
import { execa } from 'execa';

(async () => {
  let desc = '';

  try {
    desc = (await execa('git', ['describe', '--tags'])).stdout;
  } catch (e) {
    //
  }

  const define = {
    '__GIT_TAG__': JSON.stringify(desc),
  };

  const DIST = 'dist';

  // Main UMD build.
  buildMsg('UMD');
  await build(
    defineConfig({
      entry: `src/index.ts`,
      name: 'index',
      outDir: DIST,
      globalName: 'WaveformPanel',
      define,
    })
  );

  buildMsg('ESM Build');
  await build(
    defineConfig({
      entry: `src/index.ts`,
      name: 'index',
      outDir: `${DIST}/bundle`,
      define,
    })
  );

  buildMsg('Standalone module')
  await build(
    defineConfig({
      entry: `src/index.ts`,
      name: 'index',
      outDir: `${DIST}/standalone`,
      external: ['waveform-data', 'zustand/vanilla'],
      define,
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
