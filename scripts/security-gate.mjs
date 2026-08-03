#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const rootDir = process.cwd();
const allowAuditUnavailable = process.env.SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE === 'true';
const checks = [];

const ALLOWED_LIFECYCLE_SCRIPTS = {
  'node_modules/unrs-resolver': ['install'],
  'node_modules/sharp': ['install'],
  'node_modules/@swc/core': ['postinstall'],
};

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

function readJsonAt(relativePath) {
  const absolute = resolve(rootDir, relativePath);
  const content = readFileSync(absolute, 'utf8');
  return JSON.parse(content);
}

function collectWorkspacePackageJsonPaths(rootPackageJson) {
  const paths = ['package.json'];
  const workspacePatterns = Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : [];

  for (const pattern of workspacePatterns) {
    const starIndex = pattern.indexOf('/*');
    if (starIndex === -1) {
      const directPackagePath = `${pattern.replace(/\/$/, '')}/package.json`;
      if (existsSync(resolve(rootDir, directPackagePath))) {
        paths.push(directPackagePath);
      }
      continue;
    }

    const baseDir = pattern.slice(0, starIndex);
    const absoluteBase = resolve(rootDir, baseDir);
    if (!existsSync(absoluteBase)) {
      continue;
    }

    const entries = readdirSync(absoluteBase, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${baseDir}/${entry.name}/package.json`)
      .filter((candidate) => existsSync(resolve(rootDir, candidate)));

    paths.push(...entries);
  }

  return paths.sort((a, b) => a.localeCompare(b));
}

registerCheck('Dependency audit (all severities)', async () => {
  const result = await runCommand('npm', ['audit', '--audit-level=info']);
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  const auditUnavailable = /403\s+Forbidden|401|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|audit endpoint returned an error|network|unable to authenticate|unauthorized/i.test(output);

  if (result.code !== 0) {
    if (auditUnavailable) {
      if (allowAuditUnavailable) {
        return {
          ok: true,
          details: 'SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true is active: npm audit unavailability downgraded for local emergency use only. CI/final release sign-off must run without override.',
        };
      }
      return {
        ok: false,
        details: 'npm audit unavailable due to registry/auth/network. Blocking by default. Override is local emergency-only and forbidden in CI/final sign-off.',
      };
    }
    return { ok: false, details: output || 'npm audit reported one or more vulnerabilities.' };
  }

  return { ok: true, details: 'npm audit passed with zero vulnerabilities at every severity.' };
});

registerCheck('Runtime and dependency evidence', async () => {
  const commands = [
    ['npm', ['run', 'check:runtime']],
    ['npm', ['ls', '--all', '--json']],
  ];
  for (const [command, args] of commands) {
    const result = await runCommand(command, args);
    if (result.code !== 0) return { ok: false, details: `${command} ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`.trim() };
  }

  const root = readJsonAt('package.json');
  if (Object.hasOwn(root.overrides || {}, 'minimatch') || Object.hasOwn(root.overrides || {}, 'brace-expansion')) {
    return { ok: false, details: 'Global minimatch/brace-expansion overrides are forbidden because consumers require different majors.' };
  }
  const requiredScripts = ['check:runtime', 'test:sharp', 'test:svg', 'test:next-image'];
  const missing = requiredScripts.filter((name) => typeof root.scripts?.[name] !== 'string');
  if (missing.length) return { ok: false, details: `Missing mandatory evidence scripts: ${missing.join(', ')}` };
  if (!existsSync(resolve(rootDir, 'docs/dependency-security-runtime.md'))) return { ok: false, details: 'Dependency override and runtime evidence documentation is missing.' };
  return { ok: true, details: 'Runtime contract, complete npm tree, safe override structure, and mandatory runtime evidence are present.' };
});

registerCheck('Supply-chain dependency source policy', async () => {
  const packageJson = readJsonAt('package.json');
  const lockJson = readJsonAt('package-lock.json');

  if (!existsSync(resolve(rootDir, 'package-lock.json'))) {
    return { ok: false, details: 'package-lock.json is missing.' };
  }

  if (typeof packageJson.packageManager !== 'string' || !packageJson.packageManager.startsWith('npm@10.')) {
    return { ok: false, details: 'Root package.json must define packageManager pinned to npm@10.x.' };
  }

  if (lockJson.lockfileVersion !== 3) {
    return { ok: false, details: `Expected package-lock lockfileVersion=3, got ${String(lockJson.lockfileVersion)}.` };
  }

  const disallowedSpecPatterns = [
    { label: 'file_spec', regex: /^file:/i },
    { label: 'git_spec', regex: /^(?:git\+|git:|github:)/i },
    { label: 'http_spec', regex: /^http:/i },
    { label: 'url_tarball_spec', regex: /^https?:\/\//i },
  ];

  const badSpecs = [];
  const dependencyBlocks = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const scanPackageSpec = (pkgPath, json) => {
    for (const block of dependencyBlocks) {
      const deps = json?.[block];
      if (!deps || typeof deps !== 'object') continue;
      for (const [depName, spec] of Object.entries(deps)) {
        if (typeof spec !== 'string') continue;
        for (const pattern of disallowedSpecPatterns) {
          if (pattern.regex.test(spec)) {
            badSpecs.push(`${pkgPath} -> ${block}.${depName} (${pattern.label})`);
            break;
          }
        }
      }
    }
  };

  const packagePaths = collectWorkspacePackageJsonPaths(packageJson);
  for (const pkgPath of packagePaths) {
    scanPackageSpec(pkgPath, readJsonAt(pkgPath));
  }

  const rootName = typeof packageJson.name === 'string' ? packageJson.name : null;
  const internalWorkspaceNames = new Set();
  for (const pkgPath of packagePaths) {
    const pkg = readJsonAt(pkgPath);
    if (pkgPath === 'package.json') continue;
    if (typeof pkg.name === 'string') {
      internalWorkspaceNames.add(pkg.name);
    }
  }
  if (rootName) internalWorkspaceNames.add(rootName);

  const rootExternalDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };
  const confusionFindings = [];
  for (const internalName of internalWorkspaceNames) {
    if (Object.prototype.hasOwnProperty.call(rootExternalDeps, internalName)) {
      confusionFindings.push(`Root dependency duplicates internal workspace package: ${internalName}`);
    }
  }

  const lockPackages = lockJson?.packages && typeof lockJson.packages === 'object' ? lockJson.packages : {};
  const lockSourceFindings = [];
  const allowedWorkspaceResolvedPrefixes = ['apps/', 'packages/', 'services/'];

  for (const [packagePath, packageMeta] of Object.entries(lockPackages)) {
    if (!packageMeta || typeof packageMeta !== 'object') continue;
    const resolved = packageMeta.resolved;
    if (typeof resolved !== 'string') continue;

    const isWorkspaceLink = resolved.startsWith('file:') || allowedWorkspaceResolvedPrefixes.some((prefix) => resolved.startsWith(prefix));
    if (isWorkspaceLink) continue;

    if (!resolved.startsWith('https://')) {
      lockSourceFindings.push(`${packagePath || '<root>'}: non-https resolved source (${resolved})`);
      continue;
    }

    if (/^(?:git\+|git:|file:|http:)/i.test(resolved)) {
      lockSourceFindings.push(`${packagePath || '<root>'}: disallowed resolved source (${resolved})`);
    }
  }

  const issues = [...badSpecs, ...lockSourceFindings, ...confusionFindings];
  if (issues.length > 0) {
    return { ok: false, details: issues.join('\n') };
  }

  return { ok: true, details: 'Package manager pinning, lockfile version, dependency source specs, lockfile tarball source policy, and dependency-confusion checks passed.' };
});

registerCheck('Lifecycle script risk policy', async () => {
  const rootPackage = readJsonAt('package.json');
  const packagePaths = collectWorkspacePackageJsonPaths(rootPackage);
  const riskyScriptNames = ['preinstall', 'install', 'postinstall', 'prepare'];
  const findings = [];

  for (const pkgPath of packagePaths) {
    const pkg = readJsonAt(pkgPath);
    const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};

    for (const scriptName of riskyScriptNames) {
      if (!Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
        continue;
      }
      const allowlisted = ALLOWED_LIFECYCLE_SCRIPTS[pkgPath]?.includes(scriptName) ?? false;
      if (!allowlisted) {
        findings.push(`${pkgPath}: disallowed lifecycle script '${scriptName}'`);
      }
    }
  }

  if (findings.length > 0) {
    return { ok: false, details: findings.join('\n') };
  }

  return { ok: true, details: 'No disallowed lifecycle scripts found across root/workspace package.json files.' };
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
    if (typeof scriptValue !== 'string') continue;
    for (const pattern of patterns) {
      if (pattern.regex.test(scriptValue)) findings.push(`script "${scriptName}" matched pattern ${pattern.name}`);
    }
  }

  return findings.length > 0
    ? { ok: false, details: findings.join('\n') }
    : { ok: true, details: 'No obvious risky shell patterns found in root package scripts.' };
});

registerCheck('Secret scanning (static patterns + sensitive files)', async () => {
  const excludedDirs = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git']);
  const excludedFiles = new Set(['package-lock.json']);
  const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.zip', '.gz', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mov', '.avi', '.mp3', '.wav']);
  const findings = [];

  const sensitiveFileNames = ['.env', '.env.local', '.npmrc', '.yarnrc'];
  for (const filename of sensitiveFileNames) {
    if (existsSync(resolve(rootDir, filename))) {
      findings.push(`${filename}: committed sensitive runtime config file must not be in repository`);
    }
  }

  const patterns = [
    { name: 'aws_access_key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'private_key_header', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
    { name: 'github_token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
    { name: 'npm_token', regex: /\bnpm_[A-Za-z0-9]{20,}\b/ },
    { name: 'stripe_secret_key', regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
    { name: 'generic_api_key_assignment', regex: /(?:api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-.]{20,}['"]/i },
    { name: 'database_url_with_credentials', regex: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb):\/\/[^\s:@]+:[^\s@]+@/i },
  ];

  const placeholderRegex = /<SECRET>|your_api_key_here|example|placeholder/i;

  function shouldSkipFile(relativePath) {
    const fileName = relativePath.split('/').pop() || '';
    if (excludedFiles.has(fileName)) return true;
    if (relativePath.startsWith('tmp/')) return true;
    if (relativePath.startsWith('/tmp/')) return true;
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
        if (excludedDirs.has(entry.name)) continue;
        walk(absolutePath);
        continue;
      }
      if (!entry.isFile() || shouldSkipFile(relativePath)) continue;

      const fileStat = statSync(absolutePath);
      if (fileStat.size > 1_500_000) continue;

      const content = readFileSync(absolutePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        if (line.includes('security-scan-ignore')) continue;
        if (placeholderRegex.test(line)) continue;
        if (relativePath.endsWith('.env.example') && /localhost|127\.0\.0\.1/.test(line)) continue;
        for (const pattern of patterns) {
          if (pattern.regex.test(line)) {
            findings.push(`${relativePath}:${lineIndex + 1} [${pattern.name}]`);
          }
        }
      }
    }
  }

  walk(rootDir);

  return findings.length > 0
    ? { ok: false, details: findings.join('\n') }
    : { ok: true, details: 'No high-confidence secret patterns found and no sensitive local secret files were committed.' };
});

registerCheck('GitHub workflow hardening', async () => {
  const workflowPath = resolve(rootDir, '.github/workflows/ci.yml');
  if (!existsSync(workflowPath)) return { ok: false, details: '.github/workflows/ci.yml is missing.' };
  const content = readFileSync(workflowPath, 'utf8');

  const checksText = [
    { pass: /\npermissions:\s*\n\s*contents:\s*read\s*(?:\n|$)/.test(content), fail: 'Workflow must declare top-level permissions: contents: read.' },
    { pass: !/permissions:\s*write-all/.test(content) && !/contents:\s*write/.test(content), fail: 'Workflow contains disallowed write permissions.' },
    { pass: !/pull_request_target\s*:/.test(content), fail: 'Workflow must not use pull_request_target for this repository policy.' },
    { pass: /node-version:\s*['"]24\.19\.0['"]/.test(content), fail: 'Workflow must pin setup-node to exact Node 24.19.0.' },
    { pass: /npm install --global npm@10\.8\.2/.test(content), fail: 'Workflow must explicitly activate npm 10.8.2.' },
    { pass: /npm run test:sharp/.test(content) && /npm run test:svg/.test(content) && /npm run test:next-image/.test(content), fail: 'Workflow is missing runtime transformation evidence.' },
    { pass: !/continue-on-error:\s*true/.test(content), fail: 'Mandatory workflow evidence cannot use continue-on-error.' },
    { pass: !/echo\s+.*\$(?:\{|\()?[A-Za-z_][A-Za-z0-9_]*(?:\}|\))?/i.test(content), fail: 'Workflow appears to echo environment variables directly.' },
    { pass: !/smoke:production/.test(content), fail: 'Workflow must not run smoke:production in CI.' },
  ];

  const failures = checksText.filter((item) => !item.pass).map((item) => item.fail);
  return failures.length > 0
    ? { ok: false, details: failures.join('\n') }
    : { ok: true, details: 'Workflow permissions/events/node pin and CI exposure checks passed.' };
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
