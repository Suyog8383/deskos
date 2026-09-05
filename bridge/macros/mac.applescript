-- DeskOS bridge macros — macOS
--
-- Called by macroExecutor.js as: osascript mac.applescript <action>

on run argv
    if (count of argv) is 0 then
        error "Usage: osascript mac.applescript <action>"
    end if
    set theAction to item 1 of argv

    if theAction is "volume_up" then
        set volume output volume ((output volume of (get volume settings)) + 10)
    else if theAction is "volume_down" then
        set volume output volume ((output volume of (get volume settings)) - 10)
    else if theAction is "mute_toggle" then
        set isMuted to output muted of (get volume settings)
        set volume with output muted (not isMuted)
    else if theAction is "desktop_left" then
        tell application "System Events" to key code 123 using {control down} -- Spaces: move left
    else if theAction is "desktop_right" then
        tell application "System Events" to key code 124 using {control down} -- Spaces: move right
    else if theAction is "app_switch" then
        tell application "System Events"
            key down command
            key code 48 -- Tab
            key up command
        end tell
    else if theAction is "play_pause" or theAction is "next_track" or theAction is "prev_track" then
        my sendMediaCommand(theAction)
    else
        error "Unknown action: " & theAction
    end if
end run

-- Best effort: target common players directly by name. Simulating the
-- real hardware media keys on macOS needs a small compiled NSEvent helper,
-- which is out of scope for the hackathon build — extend here if a judge
-- asks for it live.
on sendMediaCommand(theAction)
    try
        if application "Spotify" is running then
            if theAction is "play_pause" then
                tell application "Spotify" to playpause
            else if theAction is "next_track" then
                tell application "Spotify" to next track
            else
                tell application "Spotify" to previous track
            end if
            return
        end if
    end try
    try
        if application "Music" is running then
            if theAction is "play_pause" then
                tell application "Music" to playpause
            else if theAction is "next_track" then
                tell application "Music" to next track
            else
                tell application "Music" to previous track
            end if
        end if
    end try
end sendMediaCommand
