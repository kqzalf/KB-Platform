@echo off
echo Setting up GPU support for KB Platform...
echo.

echo Checking for NVIDIA GPU...
nvidia-smi >nul 2>&1
if %errorlevel% == 0 (
    echo NVIDIA GPU detected!
    echo Installing NVIDIA Container Toolkit...
    echo.
    echo Please run the following commands in PowerShell as Administrator:
    echo.
    echo 1. Install NVIDIA Container Toolkit:
    echo    winget install Nvidia.ContainerToolkit
    echo.
    echo 2. Restart Docker Desktop
    echo.
    echo 3. Start the platform with GPU support:
    echo    docker compose -f docker-compose.gpu.yml up -d
    echo.
    echo 4. Check GPU usage:
    echo    docker exec kb_platform-ollama-1 nvidia-smi
    echo.
    pause
    exit /b 0
)

echo Checking for AMD GPU...
wmic path win32_VideoController get name | findstr /i "amd\|radeon" >nul 2>&1
if %errorlevel% == 0 (
    echo AMD GPU detected!
    echo.
    echo For AMD GPU support, you need to:
    echo.
    echo 1. Install ROCm support for Windows
    echo 2. Update docker-compose.gpu.yml to uncomment AMD GPU lines
    echo 3. Use: docker compose -f docker-compose.gpu.yml up -d
    echo.
    pause
    exit /b 0
)

echo No GPU detected or GPU drivers not installed.
echo The platform will run on CPU (slower but functional).
echo.
echo To start with CPU:
echo docker compose up -d
echo.
pause
