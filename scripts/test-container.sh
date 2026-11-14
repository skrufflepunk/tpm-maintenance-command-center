#!/usr/bin/env bash
# Local synthetic image smoke only: no published ports, network, real records or IdP.
set -euo pipefail
image_name="${1:-tpm-maintenance:review}"
docker run --rm --network none --entrypoint node -i "$image_name" --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, mkdir, writeFile, rm, access, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
assert.notEqual(process.getuid(),0,'Runtime must be non-root');
for (const file of ['server/testSupport.ts','test-support','tests','/run/secrets/proxy_ca']) {
  await assert.rejects(access(file));
}
assert(!/Continue as synthetic|synthetic-client|synthetic-admin/.test(await readFile('build-server/index.mjs','utf8')));
const unconfigured=spawn(process.execPath,['build-server/index.mjs'],{stdio:['ignore','ignore','pipe']});
let safeError='';unconfigured.stderr.on('data',(data)=>safeError+=data);
const [invalidCode]=await once(unconfigured,'exit');
assert.equal(invalidCode,1);assert.match(safeError,/configuration is incomplete or invalid/);
const dir=await mkdtemp(join(tmpdir(),'tpm-container-synthetic-'));
await mkdir(join(dir,'data'),{mode:0o700});
await writeFile(join(dir,'key'),randomBytes(32).toString('base64'),{mode:0o600});
await writeFile(join(dir,'roles.json'),JSON.stringify({'synthetic-container-admin':'administrator'}),{mode:0o600});
const child=spawn(process.execPath,['build-server/index.mjs'],{stdio:['ignore','ignore','pipe'],env:{...process.env,NODE_ENV:'production',PORT:'8787',TPM_BIND_ADDRESS:'127.0.0.1',TPM_APP_ORIGIN:'https://maintenance.example.invalid',TPM_AUTH_PROVIDER:'oidc',TPM_OIDC_ISSUER:'https://identity.example.invalid',TPM_OIDC_CLIENT_ID:'synthetic-container-only',TPM_OIDC_ALLOWED_ORIGINS:'https://identity.example.invalid',TPM_STORAGE_KEY_FILE:join(dir,'key'),TPM_USERS_FILE:join(dir,'roles.json'),TPM_DATA_DIRECTORY:join(dir,'data'),TPM_FRAME_ANCESTORS:'',TPM_ALLOW_SCHEDULED_CSV:'false'}});
child.stderr.resume();
try {
  let ready=false;const deadline=Date.now()+10000;
  while(Date.now()<deadline) {
    try {ready=(await fetch('http://127.0.0.1:8787/healthz')).ok;if(ready)break;}catch{}
    await new Promise((resolve)=>setTimeout(resolve,100));
  }
  assert(ready,'Synthetic protected runtime did not start');
  const gate=await fetch('http://127.0.0.1:8787/');
  assert.equal(gate.status,200);assert((await gate.text()).includes('No maintenance data is shown'));
  assert.equal(gate.headers.get('cache-control'),'no-store');
  assert(gate.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  for(const path of ['/api/bootstrap','/api/imports','/assets/private.js'])assert.equal((await fetch('http://127.0.0.1:8787'+path)).status,401);
  process.stdout.write('Container smoke PASS: non-root, production-only files, absent-config denial, private synthetic mounts, healthy runtime, data-free gate, API/asset denial, framing/no-store. No ports published or outbound network.\n');
} finally {
  const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;
  await rm(dir,{recursive:true,force:true});
}
NODE
