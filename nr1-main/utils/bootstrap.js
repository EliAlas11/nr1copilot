// utils/bootstrap.js
const { checkDependencies } = require('./health');

async function bootstrapDiagnostics({ port, env, mongoUri, redisUrl, s3Bucket, jwtSet }) {
  // Print banner
  console.log('==============================');
  console.log('   NR1 Copilot Backend Start   ');
  console.log('==============================');
  console.log(`Environment: ${env}`);
  console.log(`Port: ${port}`);
  console.log(`Mongo URI: ${mongoUri}`);
  console.log(`Redis URL: ${redisUrl}`);
  console.log(`S3 Bucket: ${s3Bucket || 'not set'}`);
  console.log(`JWT Secret Set: ${jwtSet ? 'yes' : 'no'}`);
  try {
    const health = await checkDependencies();
    console.log('Dependency health:', health);
  } catch (e) {
    console.warn('Dependency health check failed:', e.message);
  }
}

function gracefulShutdown(server, mongoose, logWithLevel) {
  process.on('SIGTERM', () => {
    logWithLevel('info', 'SIGTERM received, shutting down gracefully');
    server.close(() => {
      logWithLevel('info', 'HTTP server closed');
      mongoose.connection.close(() => {
        logWithLevel('info', 'MongoDB connection closed');
        process.exit(0);
      });
    });
  });
  process.on('SIGINT', () => {
    logWithLevel('info', 'SIGINT received, shutting down gracefully');
    server.close(() => {
      logWithLevel('info', 'HTTP server closed');
      mongoose.connection.close(() => {
        logWithLevel('info', 'MongoDB connection closed');
        process.exit(0);
      });
    });
  });
}

async function bootstrapServer({ app, server, port, mongoUri, logWithLevel, checkDependencies, runtimeBanner, printDeprecationWarning }) {
  // Print banner and diagnostics
  await runtimeBanner({
    port,
    env: process.env.NODE_ENV,
    mongoUri,
    redisUrl: process.env.REDIS_URL,
    s3Bucket: process.env.AWS_S3_BUCKET,
    jwtSet: !!process.env.JWT_SECRET,
    version: require('../../package.json').version,
    date: new Date().toISOString(),
  });

  // Validate MongoDB connection
  try {
    await require('mongoose').connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    logWithLevel('info', '✅ MongoDB connected');
  } catch (err) {
    logWithLevel('error', '❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
  // Validate JWT secret
  if (!process.env.JWT_SECRET) {
    logWithLevel('error', 'JWT_SECRET is required in environment');
    process.exit(1);
  }
  // Print dependency health
  try {
    const health = await checkDependencies();
    logWithLevel('info', 'Dependency health:', JSON.stringify(health));
  } catch (e) {
    logWithLevel('warn', 'Dependency health check failed:', e.message);
  }
  // Start server
  server.listen(port, () => {
    logWithLevel('info', `🚀 Server running on http://localhost:${port}`);
  });
  // Deprecation warning
  printDeprecationWarning(logWithLevel);
}

module.exports = { bootstrapDiagnostics, gracefulShutdown, bootstrapServer };
