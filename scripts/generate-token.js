#!/usr/bin/env node
// Generates a JWT for the Atomic SDK authentication guide
// (https://documentation.atomic.io/sdks/auth-SDK), signed with this repo's
// keys/atomic_private.pem, and injects it into www/js/index.js's
// ATOMIC_REQUEST_TOKEN_STRING.
//
// Env vars:
//   ATOMIC_PRIVATE_KEY_PATH  path to the private key (default: keys/atomic_private.pem)
//   ATOMIC_CUSTOMER_ID       JWT "sub" claim (default: the demo test user below)
//   ATOMIC_TOKEN_EXPIRES_IN  jsonwebtoken expiresIn value (default: 7d)

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const DEFAULT_CUSTOMER_ID = '5f9f1cc3-57e8-527a-9327-df8f89b2a999';

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

const indexJs = fs.readFileSync(indexJsPath, 'utf8');
const tokenLine = /const ATOMIC_REQUEST_TOKEN_STRING = '[^']*';/;

if (!tokenLine.test(indexJs)) {
  console.error(`Could not find ATOMIC_REQUEST_TOKEN_STRING in ${indexJsPath}.`);
  process.exit(1);
}

fs.writeFileSync(indexJsPath, indexJs.replace(tokenLine, `const ATOMIC_REQUEST_TOKEN_STRING = '${token}';`));

console.log(`Injected a fresh token into ${path.relative(process.cwd(), indexJsPath)} (expires in ${expiresIn}).`);
