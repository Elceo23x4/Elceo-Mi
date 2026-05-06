#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const rootDir = process.cwd();

const checks = [];
const allowAuditUnavailable = process.env.SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE === 'true';

function runCommand(command, args) {
  return new Promise((resolveResult) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(command, args, {
      cwd: rootDir,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolveResult({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });

    child.on('exit', (code) => {
      resolveResult({ code: code ?? 1, stdout, stderr });
    });
  });
}

function registerCheck(name, run) {
  checks.push({ name, run });
}

registerCheck('Dependency audit (high/critical)', async () => {
  const result = await runCommand('npm', ['audit', '--audit-level=high']);
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  const auditUnavailable = /403\s+Forbidden|401|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|audit endpoint returned an error|network|unable to authenticate|unauthorized/i.test(output);

  if (result.code !== 0) {
    if (auditUnavailable) {
      if (allowAuditUnavailable) {
        return {
          ok: true,
          details: 'SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true is active: npm audit registry/auth/network unavailability is downgraded to warning for local emergency use only. CI/release sign-off must run without this override.',
        };
      }
      return {
        ok: false,
        details: 'npm audit failed due to registry/auth/network unavailability. Blocking by default. Set SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true only for local emergency runs (not CI/release sign-off).',
      };
    }
    return { ok: false, details: output || 'npm audit reported high/critical vulnerabilities.' };
  }

  return { ok: true, details: 'npm audit passed with no high/critical vulnerabilities.' };
});

registerCheck('Lockfile integrity', async () => {
  const lockPath = resolve(rootDir, 'package-lock.json');
  const packagePath = resolve(rootDir, 'package.json');

  if (!existsSync(lockPath)) {
    return { ok: false, details: 'package-lock.json is missing.' };
  }

  let lockJson;
  let packageJson;

  try {
    lockJson = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    return { ok: false, details: 'package-lock.json is not valid JSON.' };
  }

  try {
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    return { ok: false, details: 'package.json is not valid JSON.' };
  }

  if (typeof lockJson.lockfileVersion !== 'number') {
    return { ok: false, details: 'package-lock.json missing numeric lockfileVersion.' };
  }

  if (typeof lockJson.name === 'string' && lockJson.name !== packageJson.name) {
    return { ok: false, details: 'Lockfile package name does not match package.json name.' };
  }

  if (typeof lockJson.version === 'string' && lockJson.version !== packageJson.version) {
    return { ok: false, details: 'Lockfile package version does not match package.json version.' };
  }

  const rootPackage = lockJson.packages && lockJson.packages[''];
  if (rootPackage && typeof rootPackage === 'object') {
    const lockDeps = rootPackage.dependencies || {};
    const lockDevDeps = rootPackage.devDependencies || {};
    const pkgDeps = packageJson.dependencies || {};
    const pkgDevDeps = packageJson.devDependencies || {};

    for (const depName of Object.keys(pkgDeps)) {
      if (!(depName in lockDeps)) {
        return { ok: false, details: `Dependency "${depName}" missing in lockfile root dependencies.` };
      }
    }

    for (const depName of Object.keys(pkgDevDeps)) {
      if (!(depName in lockDevDeps)) {
        return { ok: false, details: `Dev dependency "${depName}" missing in lockfile root devDependencies.` };
      }
    }
  }

  return { ok: true, details: 'package-lock.json presence, JSON validity, and root consistency checks passed.' };
});

registerCheck('Suspicious package script guard', async () => {
  const packagePath = resolve(rootDir, 'package.json');
  let packageJson;

  try {
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    return { ok: false, details: 'package.json is not valid JSON.' };
  }

  const scripts = packageJson.scripts || {};
  const patterns = [
    { name: 'curl_pipe_sh', regex: /curl\s+[^\n|]*\|\s*(?:sh|bash)/i },
    { name: 'wget_pipe_sh', regex: /wget\s+[^\n|]*\|\s*(?:sh|bash)/i },
    { name: 'rm_root', regex: /rm\s+-rf\s+\//i },
    { name: 'chmod_777', regex: /chmod\s+777\b/i },
    { name: 'eval_call', regex: /eval\s*\(/i },
    { name: 'base64_pipe_sh', regex: /base64\s+-d\s*\|\s*(?:sh|bash)/i },
    { name: 'nc_exec', regex: /\bnc\s+[^\n]*\s-e\b/i },
  ];

  const findings = [];
  for (const [scriptName, scriptValue] of Object.entries(scripts)) {
    if (typeof scriptValue !== 'string') {
      continue;
    }
    for (const pattern of patterns) {
      if (pattern.regex.test(scriptValue)) {
        findings.push(`script "${scriptName}" matched pattern ${pattern.name}`);
      }
    }
  }

  if (findings.length > 0) {
    return { ok: false, details: findings.join('\n') };
  }

  return { ok: true, details: 'No obvious risky shell patterns found in package scripts.' };
});

registerCheck('Secret scanning (static patterns)', async () => {
  const excludedDirs = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git']);
  const excludedFiles = new Set(['package-lock.json']);
  const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.zip', '.gz', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mov', '.avi', '.mp3', '.wav']);

  const findings = [];

  const patterns = [
    { name: 'aws_access_key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'private_key_header', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
    { name: 'github_token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
    { name: 'stripe_secret_key', regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
    { name: 'tiingo_api_key_assignment', regex: /TIINGO_API_KEY\s*[:=]\s*['"][^'"\s]{16,}['"]/i },
    { name: 'generic_api_key_assignment', regex: /(?:api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-.]{20,}['"]/i },
    { name: 'jwt_like_secret_token', regex: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}['"]/i },
    { name: 'database_url_with_credentials', regex: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb):\/\/[^\s:@]+:[^\s@]+@/i },
    { name: 'nextauth_secret_hardcoded', regex: /NEXTAUTH_SECRET\s*[:=]\s*['"][^'"\s]{12,}['"]/i },
    { name: 'internal_api_token_hardcoded', regex: /INTERNAL_API_TOKEN\s*[:=]\s*['"][^'"\s]{12,}['"]/i },
  ];

  const placeholderRegex = /<SECRET>|your_api_key_here|example|placeholder/i;

  function shouldSkipFile(relativePath) {
    const fileName = relativePath.split('/').pop() || '';
    if (excludedFiles.has(fileName)) return true;
    if (/\.log(\.\d+)?$/i.test(fileName)) return true;
    const extension = extname(fileName).toLowerCase();
    if (binaryExtensions.has(extension)) return true;
    return false;
  }

  function walk(directoryPath) {
    const entries = readdirSync(directoryPath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = join(directoryPath, entry.name);
      const relativePath = relative(rootDir, absolutePath).replaceAll('\\\\', '/');

      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name)) {
          continue;
        }
        walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || shouldSkipFile(relativePath)) {
        continue;
      }

      const fileStat = statSync(absolutePath);
      if (fileStat.size > 1_500_000) {
        continue;
      }

      const content = readFileSync(absolutePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        if (line.includes('security-scan-ignore')) {
          continue;
        }
        if (placeholderRegex.test(line)) {
          continue;
        }
        if (relativePath.endsWith('.env.example') && /localhost|127\.0\.0\.1/.test(line)) {
          continue;
        }
        for (const pattern of patterns) {
          if (pattern.regex.test(line)) {
            findings.push(`${relativePath}:${lineIndex + 1} [${pattern.name}]`);
          }
        }
      }
    }
  }

  walk(rootDir);

  if (findings.length > 0) {
    return { ok: false, details: findings.join('\n') };
  }

  return { ok: true, details: 'No high-confidence secret patterns found.' };
});

registerCheck('GitHub workflow hardening', async () => {
  const workflowPath = resolve(rootDir, '.github/workflows/ci.yml');
  if (!existsSync(workflowPath)) {
    return { ok: false, details: '.github/workflows/ci.yml is missing.' };
  }

  const content = readFileSync(workflowPath, 'utf8');

  if (!/\npermissions:\s*\n\s*contents:\s*read\s*(?:\n|$)/.test(content)) {
    return { ok: false, details: 'Workflow must declare top-level restrictive permissions with contents: read.' };
  }

  if (/permissions:\s*write-all/.test(content) || /contents:\s*write/.test(content)) {
    return { ok: false, details: 'Workflow contains write permissions (write-all or contents: write), which are not allowed in this gate.' };
  }

  if (/echo\s+.*(SECRET|TOKEN|KEY|PASSWORD)/i.test(content)) {
    return { ok: false, details: 'Workflow appears to echo sensitive variables.' };
  }

  return { ok: true, details: 'Workflow permissions and secret-echo safeguards passed.' };
});

(async function main() {
  const failures = [];
  for (let index = 0; index < checks.length; index += 1) {
    const check = checks[index];
    console.log(`\n${index + 1}. ${check.name}`);
    try {
      const result = await check.run();
      if (result.ok) {
        console.log(`PASS: ${result.details}`);
      } else {
        failures.push({ name: check.name, details: result.details });
        console.log(`FAIL: ${result.details}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown check error';
      failures.push({ name: check.name, details: message });
      console.log(`FAIL: ${message}`);
    }
  }

  console.log('\nSecurity gate summary');
  console.log(`Passed: ${checks.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log('\nFailed checks:');
    for (const failure of failures) {
      console.log(`- ${failure.name}: ${failure.details}`);
    }
    process.exit(1);
  }
})();
