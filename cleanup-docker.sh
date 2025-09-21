#!/bin/bash

echo "=== Aggressive Docker Cleanup Script ==="
echo "This will clean up Docker system to free maximum space for building"
echo

echo "1. Stopping all containers..."
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || echo "No containers to stop"

echo "2. Removing all containers..."
sudo docker rm $(sudo docker ps -aq) 2>/dev/null || echo "No containers to remove"

echo "3. Removing all images..."
sudo docker rmi -f $(sudo docker images -aq) 2>/dev/null || echo "No images to remove"

echo "4. Removing unused volumes..."
sudo docker volume prune -f

echo "5. Removing unused networks..."
sudo docker network prune -f

echo "6. Removing build cache..."
sudo docker builder prune -a -f

echo "7. System cleanup..."
sudo docker system prune -a -f --volumes

echo "8. Cleaning up system temp files..."
sudo rm -rf /tmp/* 2>/dev/null || echo "No temp files to clean"
sudo rm -rf /var/tmp/* 2>/dev/null || echo "No var temp files to clean"

echo "9. Cleaning package manager caches..."
sudo apt-get clean 2>/dev/null || echo "No apt cache to clean"

echo
echo "=== Disk usage after cleanup ==="
df -h

echo
echo "=== Docker system info ==="
sudo docker system df

echo
echo "=== Available space in /var/lib/docker ==="
sudo du -sh /var/lib/docker 2>/dev/null || echo "Docker directory not accessible"
