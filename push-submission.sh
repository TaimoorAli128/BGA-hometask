#!/bin/bash
# Push DevOps submission to GitHub

echo "========================================="
echo "Pushing DevOps Submission to GitHub"
echo "========================================="
echo ""

cd "$(dirname "$0")"

# Check if git is initialized
if [ ! -d .git ]; then
    echo "ERROR: Not a git repository. Please initialize git first:"
    echo "  git init"
    echo "  git remote add origin <your-repo-url>"
    exit 1
fi

# Get the remote URL
REPO_URL=$(git config --get remote.origin.url)

if [ -z "$REPO_URL" ]; then
    echo "ERROR: No remote 'origin' configured"
    echo "Please run: git remote add origin <your-repo-url>"
    exit 1
fi

echo "Repository: $REPO_URL"
echo ""

# Add all files
echo "Adding files..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit. Already up to date."
    exit 0
fi

# Commit
echo "Committing changes..."
git commit -m "Add DevOps infrastructure: Dockerfile, docker-compose, CI/CD pipeline, and deployment documentation

- Dockerfile: Production-ready multi-stage build with health checks
- docker-compose.yml: Local development setup with multi-node support
- GitHub Actions: Automated CI/CD pipeline with testing
- DEPLOYMENT.md: Comprehensive operations runbook
- Documentation: Architecture, design decisions, and troubleshooting"

# Push to main branch
echo "Pushing to origin main..."
git push origin main

echo ""
echo "========================================="
echo "SUCCESS!"
echo "========================================="
echo "Repository URL: $REPO_URL"
echo "Branch: main"
echo ""
echo "Your submission is now live!"
