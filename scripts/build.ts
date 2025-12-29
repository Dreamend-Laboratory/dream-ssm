#!/usr/bin/env bun

import { $ } from 'bun';
import * as path from 'path';

const TARGETS = [
  'bun-darwin-arm64',
  'bun-darwin-x64',
  'bun-linux-arm64',
  'bun-linux-x64',
] as const;

type Target = typeof TARGETS[number];

interface BuildOptions {
  targets?: Target[];
  outdir?: string;
  minify?: boolean;
  sourcemap?: boolean;
}

async function build(options: BuildOptions = {}): Promise<void> {
  const {
    targets = TARGETS.slice(),
    outdir = 'dist',
    minify = true,
    sourcemap = true,
  } = options;

  const srcEntry = path.join(process.cwd(), 'src/index.ts');
  const distDir = path.join(process.cwd(), outdir);

  await $`mkdir -p ${distDir}`;

  console.log(`Building dream-ssm for ${targets.length} target(s)...\n`);

  for (const target of targets) {
    const outputName = `dream-ssm-${target.replace('bun-', '')}`;
    const outputPath = path.join(distDir, outputName);

    console.log(`  Building ${target}...`);

    try {
      const args = ['bun', 'build', '--compile', `--target=${target}`];
      if (minify) args.push('--minify');
      if (sourcemap) args.push('--sourcemap');
      args.push(`--outfile=${outputPath}`, srcEntry);

      await $`${args}`;
      console.log(`  ✓ ${outputName}`);
    } catch (error) {
      console.error(`  ✗ ${target} failed:`, error);
      process.exit(1);
    }
  }

  console.log(`\nBuild complete! Binaries in ./${outdir}/`);
}

async function buildCurrent(): Promise<void> {
  const distDir = path.join(process.cwd(), 'dist');
  const srcEntry = path.join(process.cwd(), 'src/index.ts');
  const outputPath = path.join(distDir, 'dream-ssm');

  await $`mkdir -p ${distDir}`;

  console.log('Building for current platform...');

  await $`bun build --compile --minify --sourcemap --outfile=${outputPath} ${srcEntry}`;

  console.log(`✓ Built: ${outputPath}`);
}

const args = process.argv.slice(2);

if (args.includes('--current') || args.includes('-c')) {
  await buildCurrent();
} else if (args.includes('--all') || args.includes('-a')) {
  await build();
} else {
  await buildCurrent();
}
