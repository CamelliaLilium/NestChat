# 检查和配置Windows防火墙的PowerShell脚本

# 检查当前端口监听状态
Write-Host "=== 检查端口监听状态 ===" -ForegroundColor Green
netstat -an | findstr ":3001"
netstat -an | findstr ":5173"

Write-Host "`n=== 检查防火墙规则 ===" -ForegroundColor Green
# 检查现有的Node.js相关防火墙规则
Get-NetFirewallRule -DisplayName "*Node*" -ErrorAction SilentlyContinue | Select-Object DisplayName, Enabled, Direction

Write-Host "`n=== 检查网络接口 ===" -ForegroundColor Green
# 显示所有网络接口的IP地址
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"} | Select-Object InterfaceAlias, IPAddress

Write-Host "`n=== 添加防火墙规则（如果需要）===" -ForegroundColor Yellow
Write-Host "如果端口无法访问，请以管理员身份运行以下命令："
Write-Host "New-NetFirewallRule -DisplayName 'NestChat Backend' -Direction Inbound -Port 3001 -Protocol TCP -Action Allow"
Write-Host "New-NetFirewallRule -DisplayName 'NestChat Frontend' -Direction Inbound -Port 5173 -Protocol TCP -Action Allow"

Write-Host "`n=== 测试网络连通性 ===" -ForegroundColor Blue
Write-Host "从其他主机测试："
Write-Host "curl http://10.122.239.128:3001/api/v1/health"
Write-Host "telnet 10.122.239.128 3001"
