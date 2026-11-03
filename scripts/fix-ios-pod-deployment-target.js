#!/usr/bin/env node
/**
 * Cordova `after_prepare` hook — keeps the iOS build working with current Xcode.
 *
 * `cordova prepare ios` regenerates `platforms/ios/Podfile` from Cordova's template
 * and then runs `pod install`. Two problems follow:
 *
 *   1. The regenerated Podfile has no `post_install` hook, so CocoaPods leaves every
 *      pod at its own podspec `IPHONEOS_DEPLOYMENT_TARGET`. Firebase's own pods are
 *      on 15.0, but its Google dependencies are not: GoogleUtilities,
 *      GoogleDataTransport and nanopb declare 12.0, and PromisesObjC declares 9.0.
 *      Xcode fails the build on those ("the range of supported deployment target
 *      versions is 15.0 to 27.0.x"), and the `platform :ios, '15.0'` line alone does
 *      NOT lift a pod above its own podspec minimum.
 *   2. On some Ruby installs `pod install` crashes with "Unicode Normalization not
 *      appropriate for ASCII-8BIT" unless the locale is UTF-8.
 *
 * This hook re-injects the `post_install` block that forces every pod up to
 * DEPLOYMENT_TARGET, then re-runs `pod install` under a UTF-8 locale. It is
 * idempotent: if the Podfile already carries the block it does nothing, so a rebuild
 * that did not regenerate the Podfile pays no cost. If the Podfile has a
 * `post_install` block from elsewhere, the hook stops with an error rather than adding
 * a second one, which CocoaPods rejects.
 */

const fs = require('fs')
const path = require('path')
const {execFileSync} = require('child_process')

// Keep this in step with the `deployment-target` preference in config.xml.
const DEPLOYMENT_TARGET = '15.0'

// Marks the block this hook adds, so it is only ever added once.
const BLOCK_MARKER =
  '# Added by scripts/fix-ios-pod-deployment-target.js (Cordova after_prepare hook).'

const POST_INSTALL_BLOCK = `
${BLOCK_MARKER}
# Force every pod up to the minimum deployment target the toolchain supports;
# CocoaPods otherwise keeps each pod at its own lower podspec target.
post_install do |installer|
	installer.pods_project.targets.each do |target|
		target.build_configurations.each do |config|
			config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
		end
	end
end
`

module.exports = function (context) {
  const platforms = (context && context.opts && context.opts.platforms) || []
  if (platforms.indexOf('ios') === -1) {
    return
  }

  const projectRoot =
    (context && context.opts && context.opts.projectRoot) || process.cwd()
  const iosDir = path.join(projectRoot, 'platforms', 'ios')
  const podfilePath = path.join(iosDir, 'Podfile')

  if (!fs.existsSync(podfilePath)) {
    // No CocoaPods integration (no plugin pulled in a pod) — nothing to do.
    return
  }

  const podfile = fs.readFileSync(podfilePath, 'utf8')
  if (podfile.indexOf(BLOCK_MARKER) !== -1) {
    // The block is already present (the Podfile was not regenerated) — no work, and
    // no redundant `pod install`.
    return
  }
  if (podfile.indexOf('post_install do') !== -1) {
    // CocoaPods allows only one post_install hook per Podfile.
    throw new Error(
      '[fix-ios-pod-deployment-target] platforms/ios/Podfile already has a post_install ' +
        'block. Add the deployment target setting to it, or remove it, then run ' +
        '`cordova prepare ios` again.'
    )
  }

  console.log(
    '[fix-ios-pod-deployment-target] Re-injecting the post_install deployment-target ' +
      'block and running pod install...'
  )
  fs.writeFileSync(
    podfilePath,
    podfile.replace(/\s*$/, '\n') + POST_INSTALL_BLOCK
  )

  try {
    execFileSync('pod', ['install'], {
      cwd: iosDir,
      stdio: 'inherit',
      // A UTF-8 locale avoids the CocoaPods
      // "Unicode Normalization not appropriate for ASCII-8BIT" crash.
      env: Object.assign({}, process.env, {
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
      })
    })
  } catch (error) {
    console.error(
      '[fix-ios-pod-deployment-target] `pod install` failed. If CocoaPods is not ' +
        'installed, run `brew install cocoapods`. Original error: ' +
        (error && error.message ? error.message : error)
    )
    throw error
  }

  console.log(
    `[fix-ios-pod-deployment-target] All pods set to IPHONEOS_DEPLOYMENT_TARGET = ${DEPLOYMENT_TARGET}.`
  )
}
