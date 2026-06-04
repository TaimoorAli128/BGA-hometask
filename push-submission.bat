@echo off
REM Push DevOps submission to GitHub (Windows batch)

echo.
echo =========================================
echo Pushing DevOps Submission to GitHub
echo =========================================
echo.

pushd "%~dp0"

REM Check if git is initialized
if not exist .git (
    echo ERROR: Not a git repository. Please initialize git first:
    echo   git init
    echo   git remote add origin [your-repo-url]
    popd
    exit /b 1
)

REM Get the remote URL
for /f "tokens=*" %%I in ('git config --get remote.origin.url') do set REPO_URL=%%I

if "%REPO_URL%"=="" (
    echo ERROR: No remote 'origin' configured
    echo Please run: git remote add origin [your-repo-url]
    popd
    exit /b 1
)

echo Repository: %REPO_URL%
echo.

REM Add all files
echo Adding files...
git add .

REM Commit
echo Committing changes...
git commit -m "Add DevOps infrastructure: Dockerfile, docker-compose, CI/CD, documentation"

REM Push to main branch
echo Pushing to origin main...
git push origin main

echo.
echo =========================================
echo SUCCESS!
echo =========================================
echo Repository URL: %REPO_URL%
echo Branch: main
echo.
echo Your submission is now live!
echo.

popd
