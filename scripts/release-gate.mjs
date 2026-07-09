#!/usr/bin/env node

import { spawn } from 'node:child_process';

const steps = [
  { label: 'npm install', command: 'npm', args: ['install'] },
  { label: 'npm run typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { label: 'npm run test', command: 'npm', args: ['run', 'test'] },
  { label: 'npm run build', command: 'npm', args: ['run', 'build'] },
  { label: 'npm run -w @elceo/application-state lint', command: 'npm', args: ['run', '-w', '@elceo/application-state', 'lint'] },
  { label: 'npm run -w @elceo/analytics lint', command: 'npm', args: ['run', '-w', '@elceo/analytics', 'lint'] },
  { label: 'npm run -w @elceo/reasoning lint', command: 'npm', args: ['run', '-w', '@elceo/reasoning', 'lint'] },
  { label: 'npm run -w @elceo/notifications lint', command: 'npm', args: ['run', '-w', '@elceo/notifications', 'lint'] },
  { label: 'npm run -w apps/web lint', command: 'npm', args: ['run', '-w', 'apps/web', 'lint'] },
  { label: 'npm run check:migrations', command: 'npm', args: ['run', 'check:migrations'] },
  { label: 'npm run test:migrations', command: 'npm', args: ['run', 'test:migrations'] },
  { label: 'npm run rehearse:migrations:dry-run', command: 'npm', args: ['run', 'rehearse:migrations:dry-run'] },
  { label: 'npm run security:gate', command: 'npm', args: ['run', 'security:gate'] },
];

function runStep(step, index, total) {
  return new Promise((resolve, reject) => {
    console.log(`\n[${index + 1}/${total}] ${step.label}`);
    const child = spawn(step.command, step.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start "${step.label}": ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Step "${step.label}" terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Step "${step.label}" failed with exit code ${code}`));
        return;
      }
      resolve();
    });
  });
}

(async function main() {
  for (let i = 0; i < steps.length; i += 1) {
    try {
      await runStep(steps[i], i, steps.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown release gate error';
      console.error(`\nRelease gate failed at step ${i + 1}: ${message}`);
      process.exit(1);
    }
  }

  console.log('\nRelease gate completed successfully.');
  console.log('Next steps:');
  console.log(' - Run smoke:production against staging with ELCEO_SMOKE_BASE_URL.');
  console.log(' - Set production environment variables before launch.');
  console.log(' - Apply DB migrations in full-filename lexicographic order after staging rehearsal, backup verification, and restore rehearsal.');
})();
