#!/usr/bin/env node
// Generates a JWT for the Atomic SDK, signed with your own private key following the
// SDK authentication guide (https://documentation.atomic.io/sdks/auth-SDK), and injects
// it into www/js/index.js's ATOMIC_REQUEST_TOKEN_STRING.
//
// This is a convenience for running the boilerplate. In a real integration the session
// delegate must return a freshly minted token each time the SDK asks for one, rather
// than a token baked into the app.
//
// Required env vars:
//   ATOMIC_PRIVATE_KEY_PATH  path to the RSA private key paired with the public key
//                            registered in the Atomic Workbench
//   ATOMIC_CUSTOMER_ID       the user the token authenticates as (the JWT "sub" claim)
//
// Optional:
//   ATOMIC_TOKEN_EXPIRES_IN  jsonwebtoken expiresIn value (default: 7d)

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const privateKeyPath = process.env.ATOMIC_PRIVATE_KEY_PATH;
const customerId = process.env.ATOMIC_CUSTOMER_ID;
const expiresIn = process.env.ATOMIC_TOKEN_EXPIRES_IN || '7d';
const indexJsPath = path.join(__dirname, '..', 'www', 'js', 'index.js');

if (!privateKeyPath) {
  console.error('ATOMIC_PRIVATE_KEY_PATH is not set.');
  console.error('Point it at the RSA private key whose public key is registered in the Atomic Workbench.');
  console.error('See https://documentation.atomic.io/sdks/auth-SDK.');
  process.exit(1);
}

if (!customerId) {
  console.error('ATOMIC_CUSTOMER_ID is not set.');
  console.error('Set it to the ID of the user the token should authenticate as.');
  process.exit(1);
}

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Private key not found at ${privateKeyPath}.`);
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
