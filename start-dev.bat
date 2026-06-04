@echo off
REM Quick start script for Windows

echo.
echo Blockchain Node - Local Development Setup
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker not found. Please install Docker.
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Docker Compose not found. Please install Docker Compose.
    exit /b 1
)

echo Docker environment ready
echo.
echo Select setup option:
echo 1) Single node (Fast development)
echo 2) Multi-node (P2P testing)
echo 3) Run tests in Docker
echo 4) Clean up volumes and restart
echo.

set /p choice="Enter choice [1-4]: "

if "%choice%"=="1" (
    echo Starting single blockchain node...
    docker-compose up blockchain-node-1
) else if "%choice%"=="2" (
    echo Starting 2-node cluster...
    docker-compose up blockchain-node-1 blockchain-node-2
) else if "%choice%"=="3" (
    echo Running tests...
    docker-compose --profile test run blockchain-test
) else if "%choice%"=="4" (
    echo Cleaning up...
    docker-compose down -v
    echo Cleaned up. Run again to start fresh.
) else (
    echo Invalid choice
    exit /b 1
)
