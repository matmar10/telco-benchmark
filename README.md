# Telco Benchmark

Simple script to benchmark telco performance using Ookla speed test CLI script and upload the results to a Google Doc

## Install

```
npm install telco-benchmark
cd telco-benchmark
```

**NOTE: to use Google API, put API credentials in `.account.json`**

## Usage

### One-Off Run

```
# run a new test, save to CSV, and upload to Google
speedtest -f json > results.json && cat results.json | ./save.js --save-to-google
```

### Cron Job

```
*/15 * * * * cd /home/yourname/path-to-this-project && ./run.sh >> logs/output.txt 2>> logs/error.txt
```
