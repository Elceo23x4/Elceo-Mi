import assert from 'node:assert/strict';

const invalid = (reason) => `sec-g-invalid-artifact:adaptive-takeover.json:${reason}`;
const positivePid = (value) => Number.isInteger(value) && value > 0;

export function verifyAdaptiveTakeover(evidence, exactHead) {
  assert.equal(evidence?.exactGitSha, exactHead, invalid('exact-head-mismatch'));
  assert.equal(evidence?.scenario, 'adaptive-independent-process-kill-takeover', invalid('wrong-scenario'));

  const owner = evidence?.workers?.workerA;
  const early = evidence?.workers?.earlyWorkerB;
  const successor = evidence?.workers?.workerB;
  assert(owner && early && successor, invalid('required-raw-process-evidence-absent'));
  assert(positivePid(owner.pid) && positivePid(early.pid) && positivePid(successor.pid), invalid('invalid-process-pid'));
  assert.equal(new Set([owner.pid, early.pid, successor.pid]).size, 3, invalid('processes-not-independent'));
  assert.equal(new Set([owner.ownerToken, early.ownerToken, successor.ownerToken]).size, 3, invalid('owner-tokens-not-independent'));
  assert.equal(owner.published, true, invalid('owner-never-authoritative'));
  assert.equal(evidence?.observed?.ownerDeathObserved, true, invalid('owner-death-not-observed'));
  assert.equal(owner.killedSignal, 'SIGKILL', invalid('owner-kill-signal-not-captured'));
  assert(Number.isFinite(owner.acquiredAt) && Number.isFinite(owner.expiresAt) && owner.acquiredAt < owner.expiresAt, invalid('invalid-owner-lease-boundary'));
  assert(Number.isFinite(early.observedAt) && early.observedAt < owner.expiresAt, invalid('early-contender-not-before-expiry'));
  assert.equal(early.acquired, false, invalid('early-contender-acquired'));
  assert.equal(early.reason, 'adaptive_scheduler_follower', invalid('early-contender-did-not-observe-owner'));
  assert.equal(early.exit?.code, 2, invalid('early-contender-exit-not-captured'));
  assert(Number.isFinite(successor.acquiredAt) && successor.acquiredAt >= owner.expiresAt, invalid('successor-before-recovery-boundary'));
  assert.equal(successor.published, true, invalid('successor-never-published'));
  assert(Number(successor.generation) > Number(owner.generation), invalid('successor-generation-not-monotonic'));
  assert.equal(owner.expiresAt, evidence?.observed?.recoveryBoundary, invalid('recovery-boundary-mismatch'));
  assert(Number.isFinite(evidence?.observed?.recoveryAfterExpiryMs) && evidence.observed.recoveryAfterExpiryMs >= 0, invalid('invalid-recovery-latency'));
  assert(evidence.observed.recoveryAfterExpiryMs <= evidence?.recoverySloMs, invalid('recovery-slo-exceeded'));
  assert.equal(evidence?.observed?.stalePublish, false, invalid('stale-publish-succeeded'));
  assert.equal(evidence?.observed?.staleRenew, null, invalid('stale-renew-succeeded'));
  assert.equal(evidence?.observed?.staleRelease, false, invalid('stale-release-succeeded'));
  assert.equal(evidence?.observed?.currentIdentity, 'adaptive-B', invalid('successor-identity-not-authoritative'));
  assert.equal(evidence?.observed?.successorCurrent, true, invalid('successor-not-current-owner'));
  return true;
}
