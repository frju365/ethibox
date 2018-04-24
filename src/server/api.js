import dns from 'dns';
import express from 'express';
import jwt from 'jsonwebtoken';
import jwtDecode from 'jwt-decode';
import isEmail from 'validator/lib/isEmail';
import bcrypt from 'bcrypt';
import { Chart, User, Application } from './models';
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
    const { email } = jwtDecode(token);

    if (isAuthenticate(token)) {
        req.jwt_auth = true;
        req.body.user = await User.findOne({ where: { email } }) || false;
    }

    if (!req.body.user) {
        req.jwt_auth = false;
    }

    next();
});

api.get('/applications', async (req, res) => {
    if (!req.jwt_auth) return res.status(401).send({ success: false, message: 'Not authorized' });

    try {
        const apps = await Application.findAll({
            attributes: { exclude: ['id', 'chartId', 'userId', 'createAt', 'updatedAt'] },
            include: [{ model: Chart, attributes: [] }, { model: User, attributes: [], where: { email: req.body.user.email } }],
            raw: true,
        });
        return res.json({ success: true, message: 'Application listing', apps });
    } catch ({ message }) {
        return res.status(500).send({ success: false, message });
    }
});

api.post('/applications', async (req, res) => {
    if (!req.jwt_auth) return res.status(401).send({ success: false, message: 'Not authorized' });

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
    if (!req.jwt_auth) return res.status(401).send({ success: false, message: 'Not authorized' });

    try {
        const { releaseName } = req.params;
        Application.destroy({ where: { releaseName, userId: req.body.user.id } });

        return res.json({ success: true, message: 'Application uninstalled' });
    } catch ({ message }) {
        return res.status(500).send({ success: false, message });
    }
});

api.put('/applications/:releaseName', async (req, res) => {
    if (!req.jwt_auth) return res.status(401).send({ success: false, message: 'Not authorized' });

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

export default api;
