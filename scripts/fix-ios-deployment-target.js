#!/usr/bin/env node
/**
 * Cordova `after_prepare` hook — keeps the iOS projects build-able by raising
 * their deployment targets to the minimum the current Xcode supports.
 *
 * CordovaLib: cordova-ios copies `CordovaLib.xcodeproj` into `platforms/ios`
 * with `IPHONEOS_DEPLOYMENT_TARGET = 11.0`, which the `deployment-target`
 * preference in config.xml does not change. The hook raises any lower target in
 * that project file.
 *
 * Pods: `cordova prepare ios` regenerates `platforms/ios/Podfile` from Cordova's
 * template and then runs `pod install`. Two problems follow:
 *
 *   1. The regenerated Podfile loses any `post_install` hook, so CocoaPods
 *      leaves every pod at its own (low) podspec `IPHONEOS_DEPLOYMENT_TARGET`
 *      (9.0 / 10.0). The current Xcode rejects those ("supported range is 15.0
 *      to 27.0.x"), and the `platform :ios, '15.0'` line alone does NOT lift
 *      pods above their podspec minimum.
 *   2. On some Ruby installs `pod install` crashes with
 *      "Unicode Normalization not appropriate for ASCII-8BIT" unless the locale
 *      is UTF-8.
 *
 * This hook re-injects the `post_install` block (forcing every pod to the
 * minimum deployment target below) and re-runs `pod install` under a UTF-8
 * locale, so the target is applied. It is idempotent: if the Podfile already
 * carries the block it does nothing, so a plain rebuild that didn't regenerate
 * the Podfile pays no cost. If the Podfile has a `post_install` block from
 * elsewhere, the hook stops with an error rather than adding a second one,
 * which CocoaPods rejects.
 */

const fs = require('fs')
const path = require('path')
const {execFileSync} = require('child_process')

// The single place the minimum iOS deployment target is defined for the hook.
const DEPLOYMENT_TARGET = '15.0'

// Marks the block this hook adds, so it is only added once.
const BLOCK_MARKER =
  '# Added by scripts/fix-ios-deployment-target.js (Cordova after_prepare hook).'
// Also matches blocks added under the hook's earlier name, fix-ios-pods-deployment-target.js.
const BLOCK_MARKER_PATTERN =
  /# Added by scripts\/fix-ios-(pods-)?deployment-target\.js/

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

/**
 * Raises every `IPHONEOS_DEPLOYMENT_TARGET` in CordovaLib's project file that is
 * below the minimum. Leaves the file untouched when nothing needs changing.
 */
function raiseCordovaLibDeploymentTarget(iosDir) {
  const projectFilePath = path.join(
    iosDir,
    'CordovaLib',
    'CordovaLib.xcodeproj',
    'project.pbxproj'
  )
  if (!fs.existsSync(projectFilePath)) {
    return
  }

  const minimum = parseFloat(DEPLOYMENT_TARGET)
  let raised = 0
  const projectFile = fs.readFileSync(projectFilePath, 'utf8')
  const updated = projectFile.replace(
    /IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g,
    (setting, version) => {
      if (parseFloat(version) >= minimum) {
        return setting
      }
      raised++
      return `IPHONEOS_DEPLOYMENT_TARGET = ${DEPLOYMENT_TARGET};`
    }
  )

  if (raised > 0) {
    fs.writeFileSync(projectFilePath, updated)
    console.log(
      `[fix-ios-deployment-target] CordovaLib set to IPHONEOS_DEPLOYMENT_TARGET = ${DEPLOYMENT_TARGET}.`
    )
  }
}

/**
 * Adds the `post_install` block to the Podfile and re-runs `pod install`, unless
 * the Podfile already has it.
 */
function raisePodsDeploymentTarget(iosDir) {
  const podfilePath = path.join(iosDir, 'Podfile')

  if (!fs.existsSync(podfilePath)) {
    // No CocoaPods integration (e.g. no plugin pulled in a pod) — nothing to do.
    return
  }

  const podfile = fs.readFileSync(podfilePath, 'utf8')
  if (BLOCK_MARKER_PATTERN.test(podfile)) {
    // The block is already present (Podfile was not regenerated) — no work, and
    // no redundant `pod install`.
    return
  }
  if (podfile.indexOf('post_install do') !== -1) {
    // CocoaPods allows only one post_install hook per Podfile.
    throw new Error(
      '[fix-ios-deployment-target] platforms/ios/Podfile already has a post_install block. ' +
        'Add the deployment target setting to it, or remove it, then run ' +
        '`cordova prepare ios` again.'
    )
  }

  console.log(
    '[fix-ios-deployment-target] Re-injecting post_install deployment-target hook and ' +
      'running pod install…'
  )
  fs.writeFileSync(podfilePath, podfile.replace(/\s*$/, '\n') + POST_INSTALL_BLOCK)

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
      '[fix-ios-deployment-target] `pod install` failed. If CocoaPods is not installed, run ' +
        '`sudo gem install cocoapods` (or `brew install cocoapods`). Original ' +
        'error: ' +
        (error && error.message ? error.message : error)
    )
    throw error
  }

  console.log(
    `[fix-ios-deployment-target] All pods set to IPHONEOS_DEPLOYMENT_TARGET = ${DEPLOYMENT_TARGET}.`
  )
}

module.exports = function (context) {
  const platforms = (context && context.opts && context.opts.platforms) || []
  if (platforms.indexOf('ios') === -1) {
    return
  }

  const projectRoot =
    (context && context.opts && context.opts.projectRoot) || process.cwd()
  const iosDir = path.join(projectRoot, 'platforms', 'ios')

  raiseCordovaLibDeploymentTarget(iosDir)
  raisePodsDeploymentTarget(iosDir)
}
