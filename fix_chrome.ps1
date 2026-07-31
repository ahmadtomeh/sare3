# Clean up the hardware acceleration registry overrides so browsers can run at full speed
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Google\Chrome" -Name "HardwareAccelerationModeEnabled" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Edge" -Name "HardwareAccelerationModeEnabled" -ErrorAction SilentlyContinue

# Update all Chrome and Edge shortcuts to include --disable-gpu-sandbox
$shell = New-Object -ComObject WScript.Shell

$paths = @(
    "$env:USERPROFILE\Desktop",
    "$env:PUBLIC\Desktop",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
)

foreach ($folder in $paths) {
    if (Test-Path $folder) {
        Get-ChildItem -Path $folder -Filter "*.lnk" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $lnk = $shell.CreateShortcut($_.FullName)
                if ($lnk.TargetPath -like "*chrome.exe") {
                    if ($lnk.Arguments -notlike "*--disable-gpu-sandbox*") {
                        $lnk.Arguments = ($lnk.Arguments + " --disable-gpu-sandbox").Trim()
                        $lnk.Save()
                        Write-Host "Updated Chrome shortcut: $($_.FullName)"
                    }
                }
                elseif ($lnk.TargetPath -like "*msedge.exe") {
                    if ($lnk.Arguments -notlike "*--disable-gpu-sandbox*") {
                        $lnk.Arguments = ($lnk.Arguments + " --disable-gpu-sandbox").Trim()
                        $lnk.Save()
                        Write-Host "Updated Edge shortcut: $($_.FullName)"
                    }
                }
            } catch {
                # Skip shortcuts that are write-protected or throw errors
            }
        }
    }
}
