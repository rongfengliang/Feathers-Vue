const authentication = require('feathers-authentication');
const jwt = require('feathers-authentication-jwt');
const local = require('feathers-authentication-local');
const oauth2 = require('feathers-authentication-oauth2');
const GoogleStrategy = require('passport-google-oauth20');
const FacebookStrategy = require('passport-facebook');
const GithubStrategy = require('passport-github');
const verifyHooks = require('feathers-authentication-management').hooks;

const errors = require('feathers-errors');
const _ = require('lodash');

module.exports = function () {
  const app = this;
  const config = app.get('authentication');

  // Set up authentication with the secret
  app.configure(authentication(config));
  app.configure(jwt());
  app.configure(local(config.local));

  app.configure(oauth2(Object.assign({
    name: 'google',
    Strategy: GoogleStrategy
  }, config.google)));

  app.configure(oauth2(Object.assign({
    name: 'facebook',
    Strategy: FacebookStrategy
  }, config.facebook)));

  app.configure(oauth2(Object.assign({
    name: 'github',
    Strategy: GithubStrategy
  }, config.github)));

  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  app.service('authentication').hooks({
    before: {
      create: [
        authentication.hooks.authenticate(config.strategies),
        // verifyHooks.isVerified()
      ],
      remove: [
        authentication.hooks.authenticate('jwt')
      ]
    },
    after: {
      create: [
        hook => {

          if(!_.get(hook, 'params.user')) {
            return Promise.reject(new errors.Forbidden('Credentials incorrect'));
          }

          hook.result.user = hook.params.user;

          // Don't expose sensitive information.
          delete hook.result.user.password;
        }
      ]
    }
  });
};
