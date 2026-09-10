import 'server-only';

import { closeRuntimePools, installRuntimeSignalHandlers, registerRuntimeDrain } from '@elceo/db-runtime';
import { startSecGResourceSampler } from './sec-g-resource-sampler';

let installed = false;

/** Node-only composition root. Never imported into the Edge proxy graph. */
export function installNodeProcessLifecycle(): void {
  if (installed) return;
  installed = true;

  // Process-owned pools drain after SEC-G evidence takes its final in-process sample.
  registerRuntimeDrain({ name: 'postgres-runtime', drain: closeRuntimePools });
  const sampler = startSecGResourceSampler();
  if (sampler) registerRuntimeDrain({ name: 'sec-g-resource-sampler', stop: sampler.stop, drain: sampler.drain });

  installRuntimeSignalHandlers();
}
