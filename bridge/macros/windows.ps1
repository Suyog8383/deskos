# DeskOS bridge macros — Windows
#
# Simulates media/volume/desktop-switch keys via user32 keybd_event so
# gesture commands work even when no window has focus. Called by
# macroExecutor.js as:
#   powershell.exe -File windows.ps1 -Action <action>

param(
    [Parameter(Mandatory = $true)]
    [string]$Action
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class DeskOSInput {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

# Virtual-key codes used below.
$VK = @{
    MEDIA_PLAY_PAUSE = 0xB3
    MEDIA_NEXT_TRACK = 0xB0
    MEDIA_PREV_TRACK = 0xB1
    VOLUME_UP        = 0xAF
    VOLUME_DOWN      = 0xAE
    VOLUME_MUTE      = 0xAD
    LWIN             = 0x5B
    LCONTROL         = 0x11
    LEFT             = 0x25
    RIGHT            = 0x27
    TAB              = 0x09
    LMENU            = 0xA4 # left alt
}

$KEYEVENTF_KEYUP = 0x0002

function Press-Key([byte]$vk) {
    [DeskOSInput]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 30
    [DeskOSInput]::keybd_event($vk, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
}

function Press-Combo([byte[]]$vks) {
    foreach ($vk in $vks) { [DeskOSInput]::keybd_event($vk, 0, 0, [UIntPtr]::Zero) }
    Start-Sleep -Milliseconds 40
    for ($i = $vks.Length - 1; $i -ge 0; $i--) {
        [DeskOSInput]::keybd_event($vks[$i], 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
    }
}

switch ($Action) {
    'play_pause'    { Press-Key $VK.MEDIA_PLAY_PAUSE }
    'next_track'    { Press-Key $VK.MEDIA_NEXT_TRACK }
    'prev_track'    { Press-Key $VK.MEDIA_PREV_TRACK }
    'volume_up'     { Press-Key $VK.VOLUME_UP }
    'volume_down'   { Press-Key $VK.VOLUME_DOWN }
    'mute_toggle'   { Press-Key $VK.VOLUME_MUTE }
    'desktop_left'  { Press-Combo @($VK.LWIN, $VK.LCONTROL, $VK.LEFT) }
    'desktop_right' { Press-Combo @($VK.LWIN, $VK.LCONTROL, $VK.RIGHT) }
    'app_switch'    { Press-Combo @($VK.LMENU, $VK.TAB) }
    default {
        Write-Error "Unknown action: $Action"
        exit 1
    }
}
