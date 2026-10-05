# Runs inside fdroidserver's image (see setup.sh): installs the command-line tools, the NDK and
# the SDK platform the recipe needs into /sdk, which setup.sh mounts from the sfsdk volume.
set -e
cp -a /opt/android-sdk/. /sdk/ 2>/dev/null || true
cd /tmp
curl -sSLo cl.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
python3 -c "import zipfile;zipfile.ZipFile('cl.zip').extractall('/sdk/cmdline-tools-tmp')"
mkdir -p /sdk/cmdline-tools && rm -rf /sdk/cmdline-tools/latest && mv /sdk/cmdline-tools-tmp/cmdline-tools /sdk/cmdline-tools/latest && chmod -R +x /sdk/cmdline-tools/latest/bin
yes | /sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/sdk --licenses >/dev/null || true
/sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/sdk "ndk;27.1.12297006" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
chown -R 1000:1000 /sdk 2>/dev/null || true
echo SDK-DONE
