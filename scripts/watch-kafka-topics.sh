#!/bin/bash

# Script to watch Kafka topics for Debezium CDC events
# Equivalent to:
# docker run -it --rm --name watcher --link kafka:kafka quay.io/debezium/kafka:3.3 watch-topic -a -k dbserver1

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get topic prefix from argument or default to dbserver1
TOPIC_PREFIX="${1:-dbserver1}"

echo -e "${BLUE}Starting Kafka topic watcher...${NC}"
echo -e "${GREEN}Watching all topics with prefix '${TOPIC_PREFIX}'${NC}"
echo -e "${GREEN}Press Ctrl+C to stop${NC}"
echo ""

# Run the watcher container
# -it: interactive with TTY
# --rm: remove container after exit
# --network: use the same network as kafka
# --link: link to kafka container (provides hostname resolution)
# -e KAFKA_BROKER: explicitly set the Kafka broker endpoint
# -a: show all messages (from beginning)
# -k: show message keys
docker run -it --rm \
  --name watcher \
  --network nhan-starter_default \
  --link kafka:kafka \
  -e KAFKA_BROKER=kafka:9092 \
  quay.io/debezium/kafka:3.3 \
  watch-topic -a -k ${TOPIC_PREFIX}

