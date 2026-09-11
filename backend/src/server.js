const app = require('./app');
const { sequelize } = require('./models');
const config = require('./config');

async function start() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
    // Sync in development only; use migrations in production
    if (config.nodeEnv !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('Database synced');
    }
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
