#!/bin/sh

export PATH="$PATH:/usr/local/bin:/usr/local/sbin"
export PATH="$PATH:~/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH="$PATH:~/.local-env/bin"
export PATH="$PATH:~/.bin"

# node/nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "------------------------------------"
timestamp=$(date +%T)
echo "[${timestamp}] Running speed test..."
osascript -e 'display notification "Running speed test now..." with title "Speed Test"'
nvm use > /dev/null 2>&1
speedtest -f json > result.json && cat result.json | ./save.js --save-to-google
rm result.json
timestamp=$(date +%T)
echo "[${timestamp}] Ran speed test OK."
