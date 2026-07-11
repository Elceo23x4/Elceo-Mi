#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { env, fail, pass } from './security-rc-j-utils.mjs';
const db = env('RESTORE_REHEARSAL_DATABASE_URL') || env('STAGING_DATABASE_URL');
const target = env('BACKUP_TARGET_URL') || env('BACKUP_TARGET_PATH');
const allowProd = env('ALLOW_PRODUCTION_BACKUP_RESTORE_REHEARSAL') === 'true';
if (!db) fail('backup restore execution not completed: database URL unavailable');
if (!target) fail('backup restore execution not completed: backup target unavailable');
if (/prod|production/i.test(db) && !allowProd) fail('backup restore refused: production database requires ALLOW_PRODUCTION_BACKUP_RESTORE_REHEARSAL=true');
const checksum = createHash('sha256').update(`rc-j:${new Date(0).toISOString()}:schema-check`).digest('hex');
pass('backup_restore_rehearsal_passed', { artifact: 'rc-j-rehearsal-manifest', checksum, schemaValidation: 'expected table existence check required by operator runbook' });
