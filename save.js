#!/usr/bin/env node

'use strict';

const fsStandard = require('fs');
const fs = fsStandard.promises;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const ora = require('ora');
const yargs = require('yargs');
const csvStringify = require('csv-stringify/lib/sync');

const BYTES_PER_MBPS = 125000;

async function upload(argv) {
  const {
    csvFile,
    googleCredsFile,
    header,
    inputFile,
    saveToGoogle,
    saveToLocalCsv,
    spreadsheetId,
    worksheetName
  } = argv;

  const spinner = ora();

  try {
    spinner.start(`Parsing result into row...`);
    let testReport;
    try {
      // TODO: if this fails, cannot process.exit
      const stdinBuffer = fsStandard.readFileSync(0);
      testReport = JSON.parse(stdinBuffer.toString());
    } catch (err) {
      spinner.info(`No JSON in stdin; trying filename '${inputFile}'...`);
      const testReportFileContent = await fs.readFile(inputFile, 'utf8');
      testReport = JSON.parse(testReportFileContent);
      spinner.succeed(`Read JSON from filename '${inputFile}' OK.`);
    }
    const row = 'log' === testReport.type ? {
      'When': testReport.timestamp,
      'Type': testReport.type,
      'ISP': testReport.isp,
      'Message': testReport.message,
      'Level': testReport.level,
    } : {
      'When': testReport.timestamp,
      'Type': testReport.type,
      'ISP': testReport.isp,
      'DL Bandw': testReport.download.bandwidth / BYTES_PER_MBPS,
      'DL Bytes': testReport.download.bytes / BYTES_PER_MBPS,
      'DL Elapsed': testReport.download.elapsed,
      'UL Bandw': testReport.upload.bandwidth / BYTES_PER_MBPS,
      'UL Bytes': testReport.upload.bytes / BYTES_PER_MBPS,
      'UL Elapsed': testReport.upload.elapsed,
      'Ping Jitter': testReport.ping.jitter,
      'Ping Latency': testReport.ping.latency,
      'Source IP': testReport.interface.externalIp,
      'Source MAC': testReport.interface.macAddr,
      'Dest ID': testReport.server.id,
      'Dest Name': testReport.server.name,
      'Dest Loc': `${testReport.server.location}, ${testReport.server.country}`,
      'Dest Host': testReport.server.host,
      'Dest IP': testReport.server.ip,
      'Dest Port': testReport.server.port,
      'Result ID': testReport.result.id,
      'Result URL': testReport.result.url,
    };
    spinner.succeed(`Parsed result into row OK.`);

    if (saveToLocalCsv) {
      spinner.start(`Saving to CSV (file: ${csvFile})...`);
      try {
        const csvFileStats = await fs.stat(csvFile);
        if (!csvFileStats.isFile()) {
          throw new Error(`Path '${csvFile}' is not a regular file`);
        }
      } catch (err) {
        const csvHeaderRow = csvStringify([header]);
        await fs.writeFile(csvFile, csvHeaderRow);
      }
      const csvRows = csvStringify([row], {
        columns: header
      });
      await fs.appendFile(csvFile, csvRows);
      spinner.succeed(`Saved to CSV (file: ${csvFile}) OK.`);
    }

    if (saveToGoogle) {
      spinner.start(`Loading Google credentials (file: '${googleCredsFile}')...`);
      const creds = require('./.account.json');
      spinner.succeed(`Loaded Google credentials (file: '${googleCredsFile}') OK`);

      spinner.start(`Loading Google Spreadsheet (ID: ${spreadsheetId})...`);
      const doc = new GoogleSpreadsheet(spreadsheetId);
      await doc.useServiceAccountAuth(creds);
      await doc.loadInfo();
      spinner.succeed(`Loaded Google Spreadsheet (ID: ${spreadsheetId}) OK:`);

      spinner.start(`Finding Worksheet (name: ${worksheetName})`);
      let worksheet;
      doc.sheetsByIndex.forEach((s) => {
        if (s.title === worksheetName) {
          worksheet = s;
        }
      });
      if (!worksheet) {
        spinner.info(`No Worksheet found (name: ${worksheetName}).`);
        spinner.start(`Creating Worksheet (name: ${worksheetName})...`);
        worksheet = await doc.addSheet({ title: worksheetName });
        await worksheet.setHeaderRow(header);
        spinner.succeed(`Created Worksheet (name: ${worksheetName}) OK.`);
      } else {
        spinner.succeed(`Found Worksheet (name: ${worksheetName}) OK.`);
      }

      spinner.start(`Adding result row to Google Spreadsheet (ID: ${spreadsheetId})...`);
      const orderedRow = header.map((key) => row[key]);
      await worksheet.addRows([orderedRow]);
      spinner.succeed(`Added result row to Google Spreadsheet (ID: ${spreadsheetId}) OK.`);
    }
  } catch (err) {
    spinner.fail(`Failed: ${err.message}`);
    console.error(err.stack);
  }
}

yargs.command('$0 [inputFile] [spreadsheetId] [worksheetName]',
   'Save the results of a speedtest report locally (to CSV) & remotely (to Google Doc Spreadsheet)',
  (yargs) => {
    yargs.positional('inputFile', {
      demandOption: true,
      describe: 'File path or JSON string of results',
      type: 'string',
    });
    yargs.option('saveToGoogle', {
      alias: 'g',
      description: 'Whether to write results to the cloud as a Google Spreadsheet',
      type: 'boolean',
      default: false,
    });
    yargs.option('googleCredsFile', {
      alias: 'k',
      description: 'JSON file containing your Google API credentials',
      type: 'string',
      default: '.account.json',
    });
    yargs.positional('spreadsheetId', {
      alias: 'i',
      describe: 'GDrive spreadsheet ID',
      type: 'string',
      default: '18KzsHwRy_57ojkfIaX23-eDHCixd6pj_M5GZVThmZqA',
    });
    yargs.positional('worksheetName', {
      alias: 'n',
      describe: 'Worksheet name to save the content.',
      type: 'string',
      default: `${moment().subtract(1, 'month').format('YYYY-MM')}`,
    });
    yargs.option('saveToLocalCsv', {
      alias: 'c',
      description: 'Whether to write results to the CSV file',
      type: 'boolean',
      default: true,
    });
    yargs.option('csvFile', {
      alias: 'f',
      describe: 'Local CSV filename to write the output to',
      type: 'string',
      default: 'results.csv',
    });
    yargs.option('header', {
      alias: 'h',
      describe: 'Field names to make up the header row',
      type: 'array',
      default: [
        'When',
        'Type',
        'ISP',
        'DL Bandw',
        'DL Bytes',
        'DL Elapsed',
        'UL Bandw',
        'UL Bytes',
        'UL Elapsed',
        'Ping Jitter',
        'Ping Latency',
        'Source IP',
        'Source MAC',
        'Dest ID',
        'Dest Name',
        'Dest Loc',
        'Dest Host',
        'Dest IP',
        'Dest Port',
        'Result ID',
        'Result URL',
        'Message',
        'Level'
      ],
    });

  }, (argv) => upload(argv))
  .parse();
