@echo off
echo [xhs-agent] 启动小红书AI内容生成助手...
echo.

:: 启动后端
echo 启动后端服务 (端口 3001)...
start "XHS-Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: 等待2秒
timeout /t 2 /nobreak >nul

:: 启动前端
echo 启动前端服务 (端口 5173)...
start "XHS-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 服务已启动！
echo 前端地址: http://localhost:5173
echo 后端健康检查: http://localhost:3001/health
echo.
pause
