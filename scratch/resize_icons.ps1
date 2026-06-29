Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$SourcePath,
        [string]$TargetPath,
        [int]$Width,
        [int]$Height
    )
    $srcImage = [System.Drawing.Image]::FromFile($SourcePath)
    $destImage = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $graphics.DrawImage($srcImage, 0, 0, $Width, $Height)
    
    $destImage.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destImage.Dispose()
    $srcImage.Dispose()
}

$source = "E:\smart-quiz-app\assets\icon.png"
$resDir = "E:\smart-quiz-app\android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi" = @(48, 108)
    "mipmap-hdpi" = @(72, 162)
    "mipmap-xhdpi" = @(96, 216)
    "mipmap-xxhdpi" = @(144, 324)
    "mipmap-xxxhdpi" = @(192, 432)
}

foreach ($folder in $sizes.Keys) {
    $sizesArray = $sizes[$folder]
    $launcherSize = $sizesArray[0]
    $fgSize = $sizesArray[1]
    
    $folderPath = Join-Path $resDir $folder
    
    # 1. ic_launcher.png
    Resize-Image -SourcePath $source -TargetPath (Join-Path $folderPath "ic_launcher.png") -Width $launcherSize -Height $launcherSize
    # 2. ic_launcher_round.png
    Resize-Image -SourcePath $source -TargetPath (Join-Path $folderPath "ic_launcher_round.png") -Width $launcherSize -Height $launcherSize
    # 3. ic_launcher_foreground.png
    Resize-Image -SourcePath $source -TargetPath (Join-Path $folderPath "ic_launcher_foreground.png") -Width $fgSize -Height $fgSize
}

Write-Host "Icons resized successfully!"
