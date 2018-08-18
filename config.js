// @TODO: All environments should share a base of common configuration.
// See https://symfony.com/doc/current/configuration/environments.html

let environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'someSecretString',
  maxChecks: 5 // @TODO: Remove code duplication. Use configuration inheretance.
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