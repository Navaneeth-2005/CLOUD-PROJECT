const sequelize = require('./config/db');
const User = require('./models/User');

async function check() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({ attributes: ['id', 'email', 'role'] });
    console.log(JSON.stringify(users, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
