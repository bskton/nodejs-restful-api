const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const util = require('util');
const debug = util.debuglog('server');

const _data = require('./data');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const server = {};

server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});

server.unifiedServer = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method.toLowerCase();
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  const queryStringObject = parsedUrl.query;
  const headers = req.headers;
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', data => {
  buffer += decoder.write(data);
  });

  req.on('end', () => {
  buffer += decoder.end();

  const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' 
    ? server.router[trimmedPath] : handlers.notFound;

  const data = {
    trimmedPath: trimmedPath,
    queryStringObject: queryStringObject,
    method: method,
    headers: headers,
    payload: helpers.parseJsonToObject(buffer)
  };

  chosenHandler(data, (statusCode, payload) => {
    statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    payload = typeof(payload) == 'object' ? payload : {};
    const payloadString = JSON.stringify(payload);
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(statusCode);
    res.end(payloadString);
    debug('Request received on path: ' + trimmedPath + ' with method ' + method
    + ' and with these query string parameters:', queryStringObject);
    debug('Request received with these headers:', headers);
    debug('Request received with this payload:', buffer);
    if (statusCode == 200) {
      debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
    } else {
      debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
    }
    debug('Returning this response:', statusCode, payload);
  });
  });
};

server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

server.init = function() {
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', 'The http server is listening on port ' + config.httpPort + ' now.');
  });
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', 'The https server is listening on port ' + config.httpsPort + ' now.');
  });
}

module.exports = server;