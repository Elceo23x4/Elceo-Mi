import 'server-only';

import { closeRuntimePools, installRuntimeSignalHandlers, registerRuntimeDrain } from '@elceo/db-runtime';

let installed = false;

/** Node-only composition root. Never imported into the Edge proxy graph. */
export function installNodeProcessLifecycle(): void {
  if (installed) return;
  installed = true;
  registerRuntimeDrain({ name: 'postgres-runtime', drain: closeRuntimePools });
  installRuntimeSignalHandlers();
}
