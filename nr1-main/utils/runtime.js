// utils/runtime.js
const chalk = require('chalk');

async function runtimeBanner({ port, env, mongoUri, redisUrl, s3Bucket, jwtSet, version, date }) {
  // Print a beautiful banner and environment summary
  const banner = `\n${chalk.cyan('==============================')}
${chalk.green('   NR1 Copilot Backend Start   ')}
${chalk.cyan('==============================')}
`;
  const info = [
    `${chalk.bold('Version:')} ${version}`,
    `${chalk.bold('Date:')} ${date}`,
    `${chalk.bold('Environment:')} ${env}`,
    `${chalk.bold('Port:')} ${port}`,
    `${chalk.bold('Mongo URI:')} ${mongoUri}`,
    `${chalk.bold('Redis URL:')} ${redisUrl}`,
    `${chalk.bold('S3 Bucket:')} ${s3Bucket || chalk.yellow('not set')}`,
    `${chalk.bold('JWT Secret Set:')} ${jwtSet ? chalk.green('yes') : chalk.red('no')}`,
  ].join('\n');
  // eslint-disable-next-line no-console
  console.log(banner + info + '\n');
}

function printDeprecationWarning(logWithLevel) {
  setTimeout(() => {
    logWithLevel('warn', 'server.js is deprecated. Please use app.js as the main entry point for the new professional backend.');
  }, 1000);
}

module.exports = { runtimeBanner, printDeprecationWarning };
