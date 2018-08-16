let environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'someSecretString'
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: process.env.HASHING_SECRET
};

const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' 
  ? process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) == 'object' 
  ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;