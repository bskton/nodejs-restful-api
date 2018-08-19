// @TODO: All environments should share a base of common configuration.
// See https://symfony.com/doc/current/configuration/environments.html

let environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'someSecretString',
  maxChecks: 5, // @TODO: Remove code duplication. Use configuration inheretance.
  twilio : {
    accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006'
  }
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: process.env.HASHING_SECRET,
  maxChecks: 5 // @TODO: Remove code duplication. Use configuration inheretance.
};

const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' 
  ? process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) == 'object' 
  ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;