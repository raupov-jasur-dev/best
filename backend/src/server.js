const app = require('./app');
const { sequelize } = require('./models');
const config = require('./config');
async function start() {
  await sequelize.authenticate();
  // Schema and administrator changes are explicit operations, never startup side effects.
  const server = app.listen(config.port, () => console.log('Buxara Best listening on ' + config.port));
  const shutdown = () => {
    server.close(async () => { await sequelize.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}
if (require.main === module) start().catch(() => { console.error('Startup failed: check database and environment configuration'); process.exit(1); });
module.exports = { start };
