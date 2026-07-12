param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [string]$OutputPath = "public/assets/video/edgeworld-crypto.mp4",

  [int]$Seconds = 5,

  [int]$Width = 1920,

  [int]$Fps = 60,

  [switch]$Interpolate
)

$ErrorActionPreference = "Stop"

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "ffmpeg was not found. Install ffmpeg and add it to PATH, then run this script again."
}

$resolvedInput = Resolve-Path -LiteralPath $InputPath
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path (Get-Location) $OutputPath
}

$outputDirectory = Split-Path -Parent $outputFullPath
if ($outputDirectory) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

$scaleFilter = "scale=w='min($Width,iw)':h=-2:flags=lanczos"
$motionFilter = if ($Interpolate) {
  "$scaleFilter,minterpolate=fps=$Fps:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p"
} else {
  "$scaleFilter,fps=$Fps,format=yuv420p"
}

& $ffmpeg.Source `
  -y `
  -hide_banner `
  -ss 0 `
  -t $Seconds `
  -i $resolvedInput `
  -an `
  -vf $motionFilter `
  -c:v libx264 `
  -preset slow `
  -crf 18 `
  -x264-params "keyint=1:min-keyint=1:scenecut=0" `
  -movflags +faststart `
  $outputFullPath

Write-Host "Prepared scrub video: $outputFullPath"
