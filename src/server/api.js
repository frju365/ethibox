import dns from 'dns';
import express from 'express';
import jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';
import isEmail from 'validator/lib/isEmail';
import bcrypt from 'bcrypt';
import graphqlHTTP from 'express-graphql';
import { buildSchema } from 'graphql';
import { sequelize, Chart, User, Application } from './models';
import { isAuthenticate, secret, externalIp } from './utils';

const api = express();
const tokenExpiration = '7d';

api.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!isEmail(email) || password.length < 6) {
        return res.json({ success: false, message: 'Email/password error' });
    }

    if (!await User.count({ where: { email } })) {
        const hashPassword = bcrypt.hashSync(password, 10);
        User.sync().then(() => User.create({ ip, email, password: hashPassword }));
        const payload = { email, demo: process.env.ENABLE_DEMO };
        const token = jwt.sign(payload, secret, { expiresIn: tokenExpiration });

        return res.json({ success: true, message: 'Register succeeded', token });
    }

    return res.status(409).send({ success: false, message: 'User already exist' });
});

api.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email }, raw: true });
    if (user && bcrypt.compareSync(password, user.password)) {
        const payload = { email, demo: process.env.ENABLE_DEMO };
        const token = jwt.sign(payload, secret, { expiresIn: tokenExpiration });

        return res.json({ success: true, message: 'Login succeeded', token });
    }

    return res.status(401).send({ success: false, message: 'Bad credentials' });
});

api.use(async (req, res, next) => {
    req.jwt_auth = false;
    const token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token && isAuthenticate(token)) {
        req.jwt_auth = true;
        const { email } = jwtDecode(token);
        req.body.user = await User.findOne({ where: { email } }) || false;
    }

    if (!token || !req.body.user) {
        return res.status(401).send({ success: false, message: 'Not authorized' });
    }

    return next();
});

api.get('/applications', async (req, res) => {
    try {
        const apps = await sequelize.query(`SELECT releaseName, domainName, state, port, error, name, category
           FROM applications
           LEFT JOIN charts AS chart ON applications.chartId = chart.id
           INNER JOIN users AS user ON applications.userId = user.id AND user.email = ?`, { replacements: [req.body.user.email], type: sequelize.QueryTypes.SELECT });

        return res.json({ success: true, message: 'Application listing', apps });
    } catch ({ message }) {
        return res.status(500).send({ success: false, message });
    }
});

api.post('/applications', async (req, res) => {
    try {
        const { name, releaseName, user } = req.body;
        const chart = await Chart.findOne({ where: { name } });

        Application.create({ releaseName, state: 'loading', user, chart }).then((application) => {
            user.addApplication(application);
            chart.addApplication(application);
        });

        return res.json({ success: true, message: 'Application installed' });
    } catch ({ message }) {
        return res.status(500).send({ success: false, message });
    }
});

api.delete('/applications/:releaseName', async (req, res) => {
    try {
        const { releaseName } = req.params;
        Application.destroy({ where: { releaseName, userId: req.body.user.id } });

        return res.json({ success: true, message: 'Application uninstalled' });
    } catch ({ message }) {
        return res.status(500).send({ success: false, message });
    }
});

api.put('/applications/:releaseName', async (req, res) => {
    const { releaseName } = req.params;
    const { domainName } = req.body;

    try {
        if (domainName) {
            const serverIp = await externalIp();
            const domainNameIp = await new Promise((resolve, reject) => {
                dns.lookup(domainName, (error, address) => {
                    if (error) {
                        return reject(new Error('DNS error, domain does not exist'));
                    }
                    return resolve(address);
                });
            });

            if (process.env.NODE_ENV === 'production' && serverIp !== domainNameIp) {
                return res.status(500).send({ success: false, message: `DNS error, create a correct A record for your domain: ${domainName}. IN A ${serverIp}.` });
            }
        }

        Application.update({ releaseName, domainName }, { where: { releaseName } });
        return res.json({ success: true, message: 'Application edited' });
    } catch ({ message }) {
        return res.status(500).send({ success: false, message });
    }
});

const schema = buildSchema(`
  type Query {
    applications(email: String!): [Application]
  }

  type Application {
    name: String
    category: String
    releaseName: String
    domainName: String
    state: String
    port: Int
    error: String
  }
`);

const rootValue = {
    applications: async ({ email }) => {
        const apps = await sequelize.query(`SELECT releaseName, domainName, state, port, error, name, category
           FROM applications
           LEFT JOIN charts AS chart ON applications.chartId = chart.id
           INNER JOIN users AS user ON applications.userId = user.id AND user.email = ?`, { replacements: [email], type: sequelize.QueryTypes.SELECT });
        return apps;
    },
};

api.use('/graphql', (req, res) => graphqlHTTP({
    schema,
    rootValue,
    context: { req, res },
    graphiql: (process.env.NODE_ENV !== 'production'),
})(req, res));

export default api;
