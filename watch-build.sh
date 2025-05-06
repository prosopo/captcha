#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter for iterations
counter=1

echo -e "${BLUE}Starting build watch loop...${NC}"
echo -e "${BLUE}Press Ctrl+C to stop${NC}\n"

while true; do
    echo -e "\n${GREEN}=== Starting iteration $counter ===${NC}"
    echo -e "${GREEN}Time: $(date '+%H:%M:%S')${NC}\n"

    # Run the build command
    echo -e "${BLUE}Running build:all...${NC}"
    if npm run build:all; then
        echo -e "${GREEN}Build completed successfully${NC}"
    else
        echo -e "${RED}Build failed${NC}"
        sleep 5
        continue
    fi

    # Run the bundle command
    echo -e "\n${BLUE}Running bundle:all...${NC}"
    if NODE_ENV=development npm run bundle:all; then
        echo -e "${GREEN}Bundle completed successfully${NC}"
    else
        echo -e "${RED}Bundle failed${NC}"
        sleep 5
        continue
    fi

    echo -e "\n${GREEN}=== Completed iteration $counter ===${NC}"
    counter=$((counter + 1))
    
    # Small delay before next iteration
    sleep 20
done 