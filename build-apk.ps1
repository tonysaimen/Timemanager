$ErrorActionPreference = "Stop"
$SDK_DIR = "C:\android-sdk"

if (-Not (Test-Path "$SDK_DIR\cmdline-tools\latest\bin\sdkmanager.bat")) {
    Write-Host "Downloading SDK..."
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $zip = "$env:TEMP\tools.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip
    Write-Host "Extracting..."
    Expand-Archive -Path $zip -DestinationPath "C:\temp-tools" -Force
    New-Item -ItemType Directory -Force -Path "$SDK_DIR\cmdline-tools\latest" | Out-Null
    Move-Item -Path "C:\temp-tools\cmdline-tools\*" -Destination "$SDK_DIR\cmdline-tools\latest\" -Force
}

$env:ANDROID_HOME = $SDK_DIR
$sm = "$SDK_DIR\cmdline-tools\latest\bin\sdkmanager.bat"

Write-Host "Accepting licenses..."
$(for($i=0; $i -lt 15; $i++) { echo "y" }) | & $sm --licenses

Write-Host "Installing platforms..."
& $sm "platforms;android-34" "build-tools;34.0.0"

Write-Host "Setting SDK dir..."
$props = "sdk.dir=C\:\\android-sdk"
Set-Content -Path "d:\project\time manager\android\local.properties" -Value $props

Write-Host "Building APK..."
Set-Location "d:\project\time manager\android"
.\gradlew assembleDebug
