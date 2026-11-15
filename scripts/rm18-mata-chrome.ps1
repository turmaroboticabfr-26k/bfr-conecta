param()
$alvos = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -match 'rm18-chrome-profile|remote-debugging-port=9347' }
$alvos | ForEach-Object {
  $cmd = $_.CommandLine
  if ($cmd.Length -gt 170) { $cmd = $cmd.Substring(0, 170) }
  Write-Output ("PID {0}  {1}" -f $_.ProcessId, $cmd)
}
$pids = @($alvos | ForEach-Object { $_.ProcessId })
if ($pids.Count -gt 0) {
  Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
  Write-Output ("mortos: {0}" -f ($pids -join ','))
} else {
  Write-Output "mortos: (nenhum)"
}
$sobra = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -match 'rm18-chrome-profile|remote-debugging-port=9347' }
Write-Output ("sobram com o marcador: {0}" -f @($sobra).Count)
