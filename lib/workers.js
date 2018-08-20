const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');

const _data = require('./data');
const helpers = require('./helpers');

const ONE_MINUTE = 1000 * 60;
const FIVE_SECONDS = 15 * 1000;
const MILLISECONDS_IN_SECONDS = 1000;

const workers = {};

workers.gatherAllChecks = function() {
  _data.list('checks', function(err, checks) {
    if (!err && checks && checks.length > 0) {
      checks.forEach(function(check) {
        _data.read('checks', check, function(err, originalCheck) {
          if (!err && originalCheck) {
            workers.validataChekData(originalCheck);
          } else {
            console.log('Error reading on of the checks data: ' + check + '.', err);
          }
        })
      })
    } else {
      console.log('Could not find any checks to process.', err);
    }
  })
}

workers.validataChekData = function(originalCheck) {
  originalCheck 
    = typeof(originalCheck) == 'object' && originalCheck !== null 
      ? originalCheck : {};
  originalCheck.id 
    = typeof(originalCheck.id) == 'string' && originalCheck.id.trim().length == 20 
      ? originalCheck.id.trim() : false;
  originalCheck.userPhone 
    = typeof(originalCheck.userPhone) == 'string' && originalCheck.userPhone.trim().length == 10 
      ? originalCheck.userPhone.trim() : false;
  originalCheck.protocol 
    = typeof(originalCheck.protocol) == 'string' 
        && ['http', 'https'].indexOf(originalCheck.protocol) > -1
      ? originalCheck.protocol : false;
  originalCheck.url 
    = typeof(originalCheck.url) == 'string' && originalCheck.url.trim().length > 0 
      ? originalCheck.url.trim() : false;
  originalCheck.method 
    = typeof(originalCheck.method) == 'string' 
        && ['post', 'get', 'put', 'delete'].indexOf(originalCheck.method) > -1
      ? originalCheck.method : false;
  originalCheck.successCodes 
    = typeof(originalCheck.successCodes) == 'object' 
        && originalCheck.successCodes instanceof Array
        && originalCheck.successCodes.length > 0
      ? originalCheck.successCodes : false;
  originalCheck.timeoutSeconds 
    = typeof(originalCheck.timeoutSeconds) == 'number' 
        && originalCheck.timeoutSeconds % 1 === 0
        && 1 <= originalCheck.timeoutSeconds && originalCheck.timeoutSeconds <= 5
      ? originalCheck.timeoutSeconds : false;
  
  originalCheck.state 
    = typeof(originalCheck.state) == 'string' && ['up', 'down'].indexOf(originalCheck.state) > -1
      ? originalCheck.state : 'down';
  originalCheck.lastChecked
    = typeof(originalCheck.timeoutSeconds) == 'number' 
        && originalCheck.lastChecked > 0
      ? originalCheck.lastChecked: false;

  if (
    originalCheck.id &&
    originalCheck.userPhone &&
    originalCheck.protocol &&
    originalCheck.url &&
    originalCheck.method &&
    originalCheck.successCodes &&
    originalCheck.timeoutSeconds
  ) {
    workers.performCheck(originalCheck);
  } else {
    console.log('Error: The check ' + originalCheck.id + ' is not proprely formatted. Skipping it.');
  }
}

workers.performCheck = function(originalCheck) {
  const checkOutcom = {
    error: false,
    responseCode: false
  }

  let outcomeSent = false;

  const parsedUrl = url.parse(originalCheck.protocol + '://' + originalCheck.url, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  const requestDetails = {
    protocol: originalCheck.protocol + ':',
    hostname: hostname,
    method: originalCheck.method.toUpperCase(),
    path: path,
    timeout: originalCheck.timeoutSeconds * MILLISECONDS_IN_SECONDS
  }

  const _moduleToUse = originalCheck.protocol == 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, function(res) {
    console.log('Check request: ', res.statusCode); // @TODO: Remove this line
    const status = res.statusCode;
    checkOutcom.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcom(originalCheck, checkOutcom);
      outcomeSent = true;
    } else {

    }
  })

  req.on('error', function(e) {
    console.log('Check request error: ', e); // @TODO: Remove this line
    checkOutcom.error = {
      Error: true,
      value: e
    }

    if (!outcomeSent) {
      workers.processCheckOutcom(originalCheck, checkOutcom);
      outcomeSent = true;
    }
  })

  req.on('timeout', function(e) {
    checkOutcom.error = {
      Error: true,
      value: 'Timeout'
    }

    if (!outcomeSent) {
      workers.processCheckOutcom(originalCheck, checkOutcom);
      outcomeSent = true;
    }
  })

  req.end();
}

workers.processCheckOutcom = function(originalCheck, checkOutcom) {
  const state = !checkOutcom.error 
      && checkOutcom.responseCode
      && originalCheck.successCodes.indexOf(checkOutcom.responseCode) > -1
    ? 'up' : 'down';

  const alertWarranted = originalCheck.lastChecked && originalCheck.state !== state ? true : false;

  const newCheck = originalCheck;
  newCheck.state = state;
  newCheck.lastChecked = Date.now();

  _data.update('checks', newCheck.id, newCheck, function(err) {
    if (!err) {
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheck);
      } else {
        console.log('Check outcome has not change. No alert needed.');
      }
    } else {
      console.log('Error trying to save updates to one of the checks:', newCheck.id);
    }
  })
}

workers.alertUserToStatusChange = function(newCheck) {
  const msg = 'Check for ' 
    + newCheck.method.toUpperCase() + ' ' 
    + newCheck.protocol + '://'
    + newCheck.url + ' is currently '
    + newCheck.state;
  console.log('Alert for user:', msg);
  helpers.sendTwilioSms(newCheck.userPhone, msg, function(err) {
    if (!err) {
      console.log('Sussecc: User was alerted about status change via sms.');
    } else {
      console.log('Could not send sms alert to user who has a state change in the check.', err);
    }
  })
}

workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, FIVE_SECONDS);
}

workers.init = function() {
  workers.gatherAllChecks();
  workers.loop();
}

module.exports = workers;