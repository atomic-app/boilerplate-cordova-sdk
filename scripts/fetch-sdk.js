#!/usr/bin/env node
// Downloads an Atomic Web SDK bundle over www/js/sdk.js.
//
// QA builds often need a bundle that is not a public release - a release candidate, or a
// build of an SDK feature branch - so the URL is configurable:
//
//   npm run fetch-sdk                            # the default release below
//   npm run fetch-sdk -- <url>                   # an explicit bundle URL
//   ATOMIC_SDK_URL=<url> npm run fetch-sdk       # same, from the environment
//
// CI passes the URL the same way, so a pipeline can be pointed at a candidate bundle
// without editing the repository.

const fs = require('fs');
const path = require('path');

const DEFAULT_SDK_URL = 'https://downloads.atomic.io/web-sdk/release/26.3.0/sdk.js';

const url = process.argv[2] || process.env.ATOMIC_SDK_URL || DEFAULT_SDK_URL;
const destination = path.join(__dirname, '..', 'www', 'js', 'sdk.js');

// The banner every bundle carries, eg. "Atomic Web SDK 26.3.0" - printed so the build log
// records exactly which bundle went in.
function bundleVersion(source) {
  const banner = source.match(/Atomic Web SDK ([^\s*]+)/);
  return banner ? banner[1] : 'unknown';
}

async function main() {
  console.log(`Downloading the Atomic Web SDK from ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const source = await response.text();
  if (!/Atomic Web SDK/.test(source)) {
    throw new Error(
      'The downloaded file does not look like an Atomic Web SDK bundle (no version banner). ' +
        'Check the URL.'
    );
  }

  fs.writeFileSync(destination, source);
  console.log(
    `Wrote Atomic Web SDK ${bundleVersion(source)} to ${path.relative(process.cwd(), destination)}.`
  );
}

main().catch((error) => {
  console.error(`Could not download the SDK bundle: ${error.message}`);
  process.exit(1);
});
