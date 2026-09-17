$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$iconPath = Join-Path $gameRoot 'assets/azhora-coast.ico'
& (Join-Path $PSScriptRoot 'create-icon.ps1') | Out-Null

$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Azhora.lnk'
# The shortcut once carried a working title; replace it rather than leave two icons.
$oldShortcut = Join-Path $desktopPath 'Azhora - Eastreena.lnk'
if (Test-Path -LiteralPath $oldShortcut) { Remove-Item -LiteralPath $oldShortcut }
$nodePath = (Get-Command node.exe).Source
$powershellPath = (Get-Command powershell.exe).Source
$launcherPath = Join-Path $gameRoot 'scripts/launch.cjs'
$nodeLiteral = $nodePath.Replace("'", "''")
$launcherLiteral = $launcherPath.Replace("'", "''")
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -Command "& ''' + $nodeLiteral + ''' ''' + $launcherLiteral + '''"'
$shortcut.WorkingDirectory = $gameRoot
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'Play Azhora: An Adventure Game'
$shortcut.WindowStyle = 7
$shortcut.Save()

# Refresh this shortcut's icon without restarting Explorer or the running game.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AzhoraShortcutNotice {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern void SHChangeNotify(uint change, uint flags, string item, IntPtr other);
}
'@
[AzhoraShortcutNotice]::SHChangeNotify(0x2000, 0x1005, $shortcutPath, [IntPtr]::Zero)

$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $powershellPath -or $verified.IconLocation -ne "$iconPath,0") { throw 'Shortcut verification failed.' }
if (!(Test-Path -LiteralPath $launcherPath) -or !(Test-Path -LiteralPath $iconPath)) { throw 'A shortcut dependency is missing.' }
[PSCustomObject]@{ Shortcut=$shortcutPath; Target=$verified.TargetPath; Arguments=$verified.Arguments; Icon=$verified.IconLocation }
