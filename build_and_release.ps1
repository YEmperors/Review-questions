$ErrorActionPreference = "Stop"

Write-Host "Building Tauri app..."
npm run tauri build

$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$version = $packageJson.version
$targetDir = "src-tauri\target\release"
$standaloneExe = "$targetDir\smart-quiz-app.exe"
$portableZip = "smart-quiz-app-portable-v$version.zip"

Write-Host "Creating portable zip..."
if (Test-Path $standaloneExe) {
    Compress-Archive -Path $standaloneExe -DestinationPath $portableZip -Force
    Write-Host "Created $portableZip"
} else {
    Write-Host "Standalone executable not found at $standaloneExe"
    exit 1
}

$bundleDir = "$targetDir\bundle"
$installerExe = Get-ChildItem -Path "$bundleDir\nsis" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
$installerMsi = Get-ChildItem -Path "$bundleDir\msi" -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1

$installerFile = $null
if ($installerExe) {
    $installerFile = $installerExe.FullName
} elseif ($installerMsi) {
    $installerFile = $installerMsi.FullName
} else {
    Write-Host "Installer not found in $bundleDir\nsis or $bundleDir\msi"
    # We will just upload the zip if installer is missing
}

Write-Host "Creating GitHub Release..."
if ($installerFile) {
    gh release create "v$version" $installerFile $portableZip -t "v$version" -n "Auto-generated release v$version"
} else {
    gh release create "v$version" $portableZip -t "v$version" -n "Auto-generated release v$version"
}

Write-Host "Done!"
