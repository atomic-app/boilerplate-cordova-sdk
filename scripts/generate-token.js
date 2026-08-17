#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const [, , customerId, expiryDaysArg, issuer, algorithmArg] = process.argv;

if (!customerId) {
  console.error('Usage: node scripts/generate-token.js <customerId> [expiryDays] [issuer] [algorithm]');
  console.error('  customerId  - a customer ID from Atomic Workbench > Test Customers');
  console.error('  expiryDays  - optional, defaults to 7 (must not exceed your account max)');
  console.error('  issuer      - optional "iss" claim, pass "" to skip and still set algorithm');
  console.error('  algorithm   - optional, one of RS256 (default) | RS512 | ES512');
  process.exit(1);
}

const expiryDays = Number(expiryDaysArg) || 7;
const algorithm = algorithmArg || 'RS256';
const privateKeyPath = path.join(__dirname, '..', 'keys', 'atomic_private.pem');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const token = jwt.sign(
  {
    sub: customerId,
  },
  privateKey,
  {
    algorithm,
    expiresIn: `${expiryDays}d`,
    ...(issuer ? { issuer } : {}),
  }
);

console.log(token);
