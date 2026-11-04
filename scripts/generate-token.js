#!/usr/bin/env node
// Generates a JWT for the Atomic SDK authentication guide
// (https://documentation.atomic.io/sdks/auth-SDK), signed with this repo's
// keys/atomic_private.pem, and injects it into www/js/index.js's
// ATOMIC_REQUEST_TOKEN_STRING.
//
// Also injects the SDK configuration constants from the environment, so CI can build
// without anyone editing index.js. Each one is optional: when it is unset, the value
// already in index.js is kept, but the script fails if that value is empty.
//
// Env vars:
//   ATOMIC_PRIVATE_KEY_PATH     path to the private key (default: keys/atomic_private.pem)
//   ATOMIC_CUSTOMER_ID          JWT "sub" claim (default: the demo test user below)
//   ATOMIC_TOKEN_EXPIRES_IN     jsonwebtoken expiresIn value (default: 7d)
//   ATOMIC_API_HOST             injected into index.js
//   ATOMIC_API_KEY              injected into index.js
//   ATOMIC_ENVIRONMENT_ID       injected into index.js
//   ATOMIC_STREAM_CONTAINER_ID  injected into index.js

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const DEFAULT_CUSTOMER_ID = '3e0bab06-be2d-4126-a01f-3643805c459b';

const CONFIG_CONSTANTS = [
  'ATOMIC_API_HOST',
  'ATOMIC_API_KEY',
  'ATOMIC_ENVIRONMENT_ID',
  'ATOMIC_STREAM_CONTAINER_ID',
];

const privateKeyPath = process.env.ATOMIC_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'keys', 'atomic_private.pem');
const customerId = process.env.ATOMIC_CUSTOMER_ID || DEFAULT_CUSTOMER_ID;
const expiresIn = process.env.ATOMIC_TOKEN_EXPIRES_IN || '7d';
const indexJsPath = path.join(__dirname, '..', 'www', 'js', 'index.js');

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Private key not found at ${privateKeyPath}.`);
  console.error('Set ATOMIC_PRIVATE_KEY_PATH, or place atomic_private.pem in keys/ (see 1Password).');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const token = jwt.sign({ sub: customerId }, privateKey, {
  algorithm: 'RS256',
  expiresIn,
});

let indexJs = fs.readFileSync(indexJsPath, 'utf8');

// Replaces the value of `const <name> = '...';`. The replacement is passed as a function so
// that a `$` in the value is not treated as a replacement pattern.
function setConstant(name, value) {
  if (/['\\\n]/.test(value)) {
    console.error(`${name} contains a quote, backslash or newline, which index.js's string literal can't hold.`);
    process.exit(1);
  }

  const line = new RegExp(`const ${name} = '([^']*)';`);
  if (!line.test(indexJs)) {
    console.error(`Could not find ${name} in ${indexJsPath}.`);
    process.exit(1);
  }

  indexJs = indexJs.replace(line, () => `const ${name} = '${value}';`);
}

function currentValue(name) {
  return indexJs.match(new RegExp(`const ${name} = '([^']*)';`))?.[1];
}

const injected = [];
for (const name of CONFIG_CONSTANTS) {
  const value = process.env[name];
  if (value) {
    setConstant(name, value);
    injected.push(name);
  } else if (!currentValue(name)) {
    console.error(`${name} is not set in the environment, and is empty in ${indexJsPath}.`);
    console.error('Set it as an environment variable, or fill it in index.js.');
    process.exit(1);
  }
}

setConstant('ATOMIC_REQUEST_TOKEN_STRING', token);

fs.writeFileSync(indexJsPath, indexJs);

const relativePath = path.relative(process.cwd(), indexJsPath);
if (injected.length) {
  console.log(`Injected ${injected.join(', ')} from the environment into ${relativePath}.`);
}
console.log(`Injected a fresh token into ${relativePath} (expires in ${expiresIn}).`);
