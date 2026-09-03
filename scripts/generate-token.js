#!/usr/bin/env node
// Generates a JWT for the Atomic SDK authentication guide
// (https://documentation.atomic.io/sdks/auth-SDK), signed with this repo's
// keys/atomic_private.pem. Prints only the token to stdout.
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

process.stdout.write(token + '\n');
