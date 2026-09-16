$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $gameRoot 'assets'
Add-Type -AssemblyName System.Drawing

# An abstract coast and winding footpath beneath the sun. Every shape is a
# vector primitive; oversampling keeps the small desktop frames clean.
function New-CoastIcon([int]$size) {
    $renderSize = [Math]::Max(512, $size * 4)
    $art = New-Object System.Drawing.Bitmap $renderSize,$renderSize
    $drawing = [System.Drawing.Graphics]::FromImage($art)
    $drawing.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $drawing.Clear([System.Drawing.Color]::Transparent)
    $drawing.ScaleTransform(($renderSize / 256.0), ($renderSize / 256.0))

    $bounds = New-Object System.Drawing.Rectangle 8,8,240,240
    $ocean = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bounds,
        [System.Drawing.ColorTranslator]::FromHtml('#36766d'),
        [System.Drawing.ColorTranslator]::FromHtml('#173f40'), 90)
    $drawing.FillEllipse($ocean, $bounds)
    $disc = New-Object System.Drawing.Drawing2D.GraphicsPath
    $disc.AddEllipse($bounds)
    $drawing.SetClip($disc)

    $land = New-Object System.Drawing.Drawing2D.GraphicsPath
    $land.StartFigure()
    $land.AddBezier(1,195, 30,168, 47,131, 81,119)
    $land.AddBezier(81,119, 103,109, 124,116, 136,124)
    $land.AddBezier(136,124, 158,140, 140,155, 112,170)
    $land.AddBezier(112,170, 80,188, 72,216, 91,260)
    $land.AddLine(91,260, 0,260)
    $land.CloseFigure()
    $earth = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#798163'))
    $drawing.FillPath($earth, $land)

    $shore = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shore.StartFigure()
    $shore.AddBezier(83,252, 63,223, 68,194, 107,172)
    $shore.AddBezier(107,172, 146,150, 151,141, 135,130)
    $shore.AddBezier(135,130, 123,121, 108,120, 98,121)
    $shore.AddBezier(98,121, 118,115, 143,119, 154,131)
    $shore.AddBezier(154,131, 182,157, 129,179, 111,198)
    $shore.AddBezier(111,198, 96,214, 106,236, 124,253)
    $shore.CloseFigure()
    $pathGold = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bounds,
        [System.Drawing.ColorTranslator]::FromHtml('#f7dca0'),
        [System.Drawing.ColorTranslator]::FromHtml('#d2a868'), 90)
    $drawing.FillPath($pathGold, $shore)

    $sun = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f3cf80'))
    $drawing.FillEllipse($sun, 145,52,44,44)

    # Two quiet water marks add detail at normal desktop sizes. The 16-pixel
    # frame keeps just the three bold silhouettes, with no ambiguous tiny dots.
    if ($size -ge 24) {
        $waterLine = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(125,126,175,155), 3)
        $waterLine.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $waterLine.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $drawing.DrawBezier($waterLine, 171,184, 182,186, 193,185, 204,181)
        $drawing.DrawBezier($waterLine, 156,210, 166,212, 177,211, 185,208)
        $waterLine.Dispose()
    }
    $drawing.ResetClip()
    $rim = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#cfb57b'), 5)
    $drawing.DrawEllipse($rim, 10.5,10.5,235,235)

    $frame = New-Object System.Drawing.Bitmap $size,$size
    $canvas = [System.Drawing.Graphics]::FromImage($frame)
    $canvas.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $canvas.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $canvas.DrawImage($art, 0,0,$size,$size)
    $canvas.Dispose()
    $rim.Dispose(); $sun.Dispose(); $pathGold.Dispose(); $shore.Dispose()
    $earth.Dispose(); $land.Dispose(); $ocean.Dispose(); $disc.Dispose()
    $drawing.Dispose(); $art.Dispose()
    return $frame
}

$frames = @()
foreach ($size in @(16,24,32,48,64,128,256)) {
    $frame = New-CoastIcon $size
    $memory = New-Object System.IO.MemoryStream
    $frame.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
    $frames += [PSCustomObject]@{ Size=$size; Bytes=$memory.ToArray() }
    if ($size -in @(16,32,256)) {
        $frame.Save((Join-Path $assetRoot "azhora-icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $memory.Dispose(); $frame.Dispose()
}

# PNG-backed ICO frames preserve transparency at every Windows shell size.
$iconPath = Join-Path $assetRoot 'azhora.ico'
$file = [System.IO.File]::Create($iconPath)
$writer = New-Object System.IO.BinaryWriter($file)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($frame in $frames) {
    $dimension = if ($frame.Size -eq 256) { 0 } else { $frame.Size }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$frame.Bytes.Length); $writer.Write([uint32]$offset)
    $offset += $frame.Bytes.Length
}
foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Bytes) }
$writer.Dispose(); $file.Dispose()

# A new shortcut resource name lets Explorer display the new art immediately
# while the application continues to use its existing azhora.ico path.
Copy-Item -LiteralPath $iconPath -Destination (Join-Path $assetRoot 'azhora-coast.ico') -Force
$preview = New-CoastIcon 512
$preview.Save((Join-Path $assetRoot 'azhora-icon-preview.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$preview.Dispose()
[PSCustomObject]@{ Icon=$iconPath; Frames=($frames.Size -join ', '); Preview=(Join-Path $assetRoot 'azhora-icon-preview.png') }
