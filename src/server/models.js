import Sequelize from 'sequelize';

const DB_PATH = '/tmp/db.sqlite';

const db = `sqlite://${DB_PATH}`;
const sequelize = new Sequelize(db, { logging: (process.env.NODE_ENV !== 'production') });

export const User = sequelize.define('user', {
    ip: { type: Sequelize.STRING, validate: { isIP: true } },
    email: { type: Sequelize.STRING, validate: { isEmail: true } },
    password: { type: Sequelize.STRING },
});

export const Application = sequelize.define('application', {
    releaseName: { type: Sequelize.STRING },
    domainName: { type: Sequelize.STRING },
    state: { type: Sequelize.STRING },
    port: { type: Sequelize.STRING },
    error: { type: Sequelize.STRING },
});

export const Chart = sequelize.define('chart', {
    name: { type: Sequelize.STRING },
    category: { type: Sequelize.STRING },
    description: { type: Sequelize.STRING },
    version: { type: Sequelize.STRING },
});

Application.User = Application.belongsTo(User);
User.Applications = User.hasMany(Application);
Application.Chart = Application.belongsTo(Chart);
Chart.Applications = Chart.hasMany(Application);

User.sync();
Application.sync();
Chart.sync();
