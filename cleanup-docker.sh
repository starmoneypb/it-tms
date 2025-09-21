#!/bin/bash

echo "=== Docker Cleanup Script ==="
echo "This will clean up Docker system to free space for building"
echo

echo "1. Removing unused containers..."
sudo docker container prune -f

echo "2. Removing unused images..."
sudo docker image prune -a -f

echo "3. Removing unused volumes..."
sudo docker volume prune -f

echo "4. Removing unused networks..."
sudo docker network prune -f

echo "5. Removing build cache..."
sudo docker builder prune -a -f

echo "6. System cleanup..."
sudo docker system prune -a -f

echo
echo "=== Disk usage after cleanup ==="
df -h

echo
echo "=== Docker system info ==="
sudo docker system df
