const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const _data = require('./lib/data');

const config = require('./config');

const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});
httpServer.listen(config.httpPort, () => {
  console.log('The http server is listening on port ' + config.httpPort + ' now.');
});

const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});
httpsServer.listen(config.httpsPort, () => {
  console.log('The https server is listening on port ' + config.httpsPort + ' now.');
});

const unifiedServer = (req, res) => {
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

  const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' 
    ? router[trimmedPath] : handlers.notFound;

  const data = {
    trimmedPath: trimmedPath,
    queryStringObject: queryStringObject,
    method: method,
    headers: headers,
    payload: buffer
  };

  chosenHandler(data, (statusCode, payload) => {
    statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    payload = typeof(payload) == 'object' ? payload : {};
    const payloadString = JSON.stringify(payload);
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(statusCode);
    res.end(payloadString);
    console.log('Request received on path: ' + trimmedPath + ' with method ' + method
    + ' and with these query string parameters:', queryStringObject);
    console.log('Request received with these headers:', headers);
    console.log('Request received with this payload:', buffer);
    console.log('Returning this response:', statusCode, payload);
  });
  });
};

const handlers = {
  ping: (data, callback) => {
  callback(200);
  },
  notFound: (data, callback) => {
  callback(404);
  }
};

const  router = {
  ping: handlers.ping
};