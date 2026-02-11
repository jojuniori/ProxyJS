<# :
@echo off
set "SCRIPT_PATH=%~f0"
:: 核心修改：使用 Start-Process 启动一个隐藏的新进程，原 CMD 窗口立刻退出
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \"Invoke-Expression (Get-Content ''%SCRIPT_PATH%'' -Raw); Start-ProxyLockTray\"'"
exit
#>

# --- 下面是 PowerShell 核心逻辑 (无需修改) ---

function Set-Proxy {
    $proxyServer = "192.168.5.11:7890"
    $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
    
    try {
        $currentEnable = (Get-ItemProperty -Path $regPath -Name ProxyEnable -ErrorAction SilentlyContinue).ProxyEnable
        $currentServer = (Get-ItemProperty -Path $regPath -Name ProxyServer -ErrorAction SilentlyContinue).ProxyServer

        if ($currentEnable -ne 1 -or $currentServer -ne $proxyServer) {
            Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 1
            Set-ItemProperty -Path $regPath -Name ProxyServer -Value $proxyServer
            Set-ItemProperty -Path $regPath -Name ProxyOverride -Value "localhost;127.*;192.168.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*"
            
            # 这里的 Write-Host 在隐藏模式下你看不到，主要用于调试
            # Write-Host "Proxy Fixed"
        }
    } catch { }
}

function Start-ProxyLockTray {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $notifyIcon = New-Object System.Windows.Forms.NotifyIcon
    # 尝试提取图标，如果失败则使用系统默认的应用图标
    try {
        $notifyIcon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon((Get-Process -Id $pid).Path)
    } catch {
        # 如果提取不到，这里其实不会显示图标，但通常 powershell.exe 是有图标的
    }
    
    $notifyIcon.Visible = $true
    $notifyIcon.Text = "系统代理锁定中"

    $contextMenu = New-Object System.Windows.Forms.ContextMenu
    $exitMenuItem = $contextMenu.MenuItems.Add("退出脚本并停止锁定 (Exit)")
    
    $exitMenuItem.add_Click({
        $timer.Stop()
        $notifyIcon.Visible = $false
        $notifyIcon.Dispose()
        [System.Windows.Forms.Application]::Exit()
    })
    
    $notifyIcon.ContextMenu = $contextMenu

    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 5000 
    $timer.add_Tick({
        Set-Proxy
    })

    Set-Proxy
    # 气泡提示只在启动时显示一次
    $notifyIcon.ShowBalloonTip(3000, "代理监控已后台运行", "窗口已隐藏，代理锁定", [System.Windows.Forms.ToolTipIcon]::Info)
    $timer.Start()

    [System.Windows.Forms.Application]::Run()
}