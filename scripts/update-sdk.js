#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const { version, downloadUrl, vendoredAt } = pkg.atomicWebSdk;
const destPath = path.join(__dirname, '..', vendoredAt);

console.log(`Fetching Atomic Web SDK ${version} from ${downloadUrl} ...`);

https
  .get(downloadUrl, { headers: { 'User-Agent': 'boilerplate-cordova-sdk-update-script' } }, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Download failed: HTTP ${res.statusCode}`);
      process.exit(1);
    }

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const versionLine = body.split('\n').find((line) => line.includes('Atomic Web SDK'));

      if (!versionLine || !versionLine.includes(version)) {
        console.error(
          `Downloaded file does not look like version ${version} (found: ${
            versionLine ? versionLine.trim() : 'no version line'
          }). Aborting without overwriting ${vendoredAt}.`
        );
        console.error('Check that package.json > atomicWebSdk.version/downloadUrl agree with each other.');
        process.exit(1);
      }

      fs.writeFileSync(destPath, body);
      console.log(`Wrote ${vendoredAt} (${body.length} bytes) — Atomic Web SDK ${version}.`);
      console.log('Remember: check the CSP in www/index.html still covers everything this version needs.');
    });
  })
  .on('error', (err) => {
    console.error('Download failed:', err.message);
    process.exit(1);
  });
