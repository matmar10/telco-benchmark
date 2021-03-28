# Telco Benchmark

Simple script to benchmark telco performance using Ookla speed test CLI script and upload the results to a Google Doc

## Install

npm install telco-benchmark
cd telco-benchmark

# to use Google API, you need credentials here
touch .account.json

## Usage

# run a new test, save to CSV, and upload to Google
speedtest -f json > results.json && cat results.json | ./save.js --save-to-google
