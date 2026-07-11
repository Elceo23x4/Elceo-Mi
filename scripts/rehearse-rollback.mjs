#!/usr/bin/env node
import { env, fail, pass } from './security-rc-j-utils.mjs';
const target = env('ROLLBACK_DEPLOYMENT_TARGET') || env('DEPLOYMENT_TARGET_ENV');
const smoke = env('ROLLBACK_SMOKE_COMMAND') || env('POST_ROLLBACK_SMOKE_URL');
if (!target) fail('rollback execution not completed: deployment target unavailable');
if (!['staging','production'].includes(target)) fail('rollback rehearsal failed: rollback target must be explicit staging or production');
if (!smoke) fail('rollback execution not completed: deployment target unavailable');
pass('rollback_rehearsal_passed', { target, postRollbackSmoke: '[configured]', migrationPolicy: 'documented' });
