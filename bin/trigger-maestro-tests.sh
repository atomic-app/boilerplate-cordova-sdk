#!/bin/bash

# debug log
set -x

echo "triggering e2e pipeline..."

function triggeriOSTests() {
    response=$(
    curl \
        --location \
        --url "https://circleci.com/api/v2/project/github/atomic-app/sdk-e2e-tests/pipeline" \
        --request POST \
        --header "Circle-Token: $CIRCLE_API_TOKEN_BH" \
        --header "content-type: application/json" \
        --data "{
                    \"branch\":\"qa-342-cordova-maestro-tests\",
                    \"parameters\":
                        {
                            \"app-url\":\"https://output.circle-artifacts.com/output/job/495c51af-2aab-4389-bbe8-d53e691a29d1/artifacts/0/HelloCordova.ipa\",
                            \"sdk\":\"cordova-ios\",
                            \"version\":\"cordova-ios-$CIRCLE_BRANCH\",
                            \"source\":\"$source\"
                        }
                }"
    )

    echo $response
}

function triggerAndroidTests() {
    response=$(
    curl \
        --location \
        --url "https://circleci.com/api/v2/project/github/atomic-app/sdk-e2e-tests/pipeline" \
        --request POST \
        --header "Circle-Token: $CIRCLE_API_TOKEN_BH" \
        --header "content-type: application/json" \
        --data "{
                    \"branch\":\"qa-342-cordova-maestro-tests\",
                    \"parameters\":
                        {
                            \"app-url\":\"https://output.circle-artifacts.com/output/job/7a11bfac-2a48-4014-8b16-d9ea170b5078/artifacts/0/app-debug.apk\",
                            \"sdk\":\"cordova-android\",
                            \"version\":\"cordova-android-$CIRCLE_BRANCH\",
                            \"source\":\"$source\"
                        }
                }"
    )

    echo $response
}

source=$2

case $1 in
   "triggeriOSTests") triggeriOSTests;;
   "triggerAndroidTests") triggerAndroidTests;;
esac
