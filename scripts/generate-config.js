#!/usr/bin/env node
// Injects the Atomic SDK setup values from environment variables into the
// constants in www/js/index.js's setupAtomic(), which are committed as empty
// strings. Used by CI (.circleci/config.yml's inject_atomic_token command);
// for manual testing you can instead fill the constants in by hand.
//
// Env vars (all required, values from the Atomic Workbench):
//   ATOMIC_API_HOST             Configuration -> SDK -> API Host (eg. "https://999-1.client-api.atomic.io")
//   ATOMIC_API_KEY              Configuration -> SDK -> API keys (eg. "my-api-key")
//   ATOMIC_ENVIRONMENT_ID       Configuration -> Environment ID (eg. "AbC12de3")
//   ATOMIC_STREAM_CONTAINER_ID  Configuration -> SDK -> Stream containers -> ID (eg. "123abcde")

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = ['ATOMIC_API_HOST', 'ATOMIC_API_KEY', 'ATOMIC_ENVIRONMENT_ID', 'ATOMIC_STREAM_CONTAINER_ID'];

const indexJsPath = path.join(__dirname, '..', 'www', 'js', 'index.js');

const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}.`);
  console.error('Set them to the values from the Atomic Workbench, then re-run.');
  process.exit(1);
}

let indexJs = fs.readFileSync(indexJsPath, 'utf8');

for (const name of REQUIRED_VARS) {
  const line = new RegExp(`const ${name} = '[^']*';`);

  if (!line.test(indexJs)) {
    console.error(`Could not find ${name} in ${indexJsPath}.`);
    process.exit(1);
  }

  const value = process.env[name].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  indexJs = indexJs.replace(line, () => `const ${name} = '${value}';`);
}

fs.writeFileSync(indexJsPath, indexJs);

console.log(`Injected ${REQUIRED_VARS.join(', ')} into ${path.relative(process.cwd(), indexJsPath)}.`);
