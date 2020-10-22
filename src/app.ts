import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import configYaml from 'config-yaml';
export const startApp = async (): Promise<void> => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: accessLogStream }));

  const port = 8080;
  const serverUsername = 'kispista';
  const serverPassword = '12345';
  const secrets = configYaml('./src/config/tokenKey.yml');
  const tokenKey = secrets.secretTokenKey;

  const authenticateJWT = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, tokenKey, (err: any) => {
        if (err) {
          return res.sendStatus(401);
        } else {
          next();
        }
      });
    } else {
      res.sendStatus(401);
    }
  };

  app.get('/breweries', authenticateJWT, async (req, res) => {
    try {
      if (Object.keys(req.query).length !== 0) {
        if (req.query.query === undefined) {
          res.status(400).send('Wrong request query param');
        } else if (req.query.query === '') {
          res.status(400).send('Empty request query param');
        } else {
          const searchQuery = req.query.query;
          const response = await axios.get(`https://api.openbrewerydb.org/breweries/search?query=${searchQuery}`);
          res.status(200).send(response.data);
        }
      } else {
        const response = await axios.get('https://api.openbrewerydb.org/breweries');
        res.status(200).send(response.data);
      }
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.post('/login', (req, res) => {
    const notExistBodyParams = !req.body.username || !req.body.password;
    const notStringBody = typeof req.body.username !== 'string' || typeof req.body.password !== 'string';
    if (notExistBodyParams || notStringBody) {
      res.status(400).send('Bad req body content');
    } else if (req.body.username !== serverUsername || req.body.password !== serverPassword) {
      res.status(401).send('Bad password or username');
    } else {
      const token = jwt.sign({ username: req.body.username }, tokenKey, { algorithm: 'HS256' });
      res.status(200).send(token);
    }
  });

  app.all('*', (_req, res) => {
    res.status(404).send('Invalid route (not found).');
  });

  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
};
