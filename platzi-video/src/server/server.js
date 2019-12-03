/* eslint-disable global-require */
import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import webpack from 'webpack';
import boom from '@hapi/boom';
import cookieParser from 'cookie-parser';
import axios from 'axios';

import main from './app';

dotenv.config();

const ENV = process.env.NODE_ENV;
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.static(`${__dirname}/public`));

// body parser
app.use(express.json());
// cookie parser
app.use(cookieParser());

console.log(`Loading ${ENV} enviroment`);
if (ENV === 'development') {
  const webpackConfig = require('../../webpack.dev.config');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const serverConfig = {
    contentBase: `http://localhost:${PORT}`,
    port: PORT,
    publicPath: webpackConfig.output.publicPath,
    hot: true,
    historyApiFallback: true,
    open: true,
    stats: { colors: true },
  };
  app.use(webpackDevMiddleware(compiler, serverConfig));
  app.use(webpackHotMiddleware(compiler));
} else {
  app.use(helmet());
  app.use(helmet.permittedCrossDomainPolicies());
  app.disable('x-powered-by');
}

// Basic strategy
require('./utils/auth/strategies/basic');

app.post('/auth/sign-in', async (req, res, next) => {
  const { rememberMe } = req.body;

  passport.authenticate('basic', (error, data) => {
    try {
      if (error || !data) next(boom.unauthorized());

      req.login(data, { session: false }, async (error) => {
        if (error) next(error);

        const { token, ...user } = data;

        res.cookie('token', token, {
          httpOnly: !(DEV === 'development'),
          secure: !(DEV === 'development'),
          maxAge: rememberMe ? THIRTY_DAYS_IN_SEC : TWO_HOURS_IN_SEC,
        });

        res.status(200).json(user);
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

app.post('/auth/sign-up', async (req, res, next) => {
  const { body: user } = req;

  try {
    const { data: { data: id } } = await axios({
      url: `${process.env.API_URL}/api/auth/sign-up`,
      method: 'post',
      data: user,
    });

    res.status(201).json({
      name: user.name,
      email: user.email,
      id,
    });
  } catch (error) {
    next(error);
  }
});

app.get('*', main);

app.listen(PORT, (err) => {
  if (err) console.log(err);
  console.log(`Server is listening on http://localhost:${PORT}`);
});
