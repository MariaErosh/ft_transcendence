#!/bin/bash
# Configuration
GOINFRE_PATH="/home/auspensk/goinfre"
USER_ID=$(id -u)
echo ":spanner: Repairing Docker paths and starting daemon..."
# 1. Create directories in goinfre if they were wiped
mkdir -p "$GOINFRE_PATH/.docker"
mkdir -p "$GOINFRE_PATH/auspensk/.local/share/docker"
# 2. Re-link to home directory
rm -rf ~/.docker
ln -sf "$GOINFRE_PATH/.docker" ~/.docker
mkdir -p ~/.local/share
rm -rf ~/.local/share/docker
ln -sf "$GOINFRE_PATH/auspensk/.local/share/docker" ~/.local/share/docker

# 4. START THE SERVICE
# In many cluster environments, you need to trigger the user-level service
systemctl --user start docker
echo ":hourglass_flowing_sand: Waiting for Docker to wake up..."
sleep 2
# 5. VERIFY
if docker info >/dev/null 2>&1; then
    echo ":white_tick: Docker is UP and running!"
else
    echo ":x: Docker daemon still not responding."
    echo "Try running this command manually: dockerd-rootless-setuptool.sh install"
fi
