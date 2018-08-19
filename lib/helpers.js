const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const config = require('../config');

const helpers = {};

helpers.hash = function(str) {
  if (typeof(str) == 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  } else {
    return false;
  }
}

helpers.parseJsonToObject = function(str) {
  try {
    return JSON.parse(str);
  } catch(e) {
    return {};
  }
}

helpers.createRandomString = function(length) {
  length = typeof(length) == 'number' && length > 0 ? length : false;

  if (length) {
    const possibleCharacters = 'abcdefjhijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 1; i <= length; i++) {
      let randomCharacter 
        = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      randomString += randomCharacter;
    }
    return randomString;
  } else {
    return false;
  }
}

helpers.sendTwilioSms = function(phone,msg,callback){
  phone = sanitizePhone(phone);
  msg = sanitizeMsg(msg);
  if(phone && msg){
    var payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+7'+phone,
      'Body' : msg
    };
    var stringPayload = querystring.stringify(payload);

    var requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    var req = https.request(requestDetails,function(res){
        var status =  res.statusCode;
        if(status == 200 || status == 201){
          callback(false);
        } else {
          callback('Status code returned was ' + status);
        }
    });

    req.on('error',function(e){
      callback(e);
    });

    req.write(stringPayload);

    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};

// @TODO: Remove code duplication. See handlers.js::sanitizePhone()
function sanitizePhone(value) {
  return typeof(value) == 'string' && value.trim().length == 10 ? value.trim() : false;
}

function sanitizeMsg(value) {
  const msg = typeof(value) == 'string' ? value.trim() : false;
  return 0 < msg.length && msg.length <= 70 ? msg : false;
}

module.exports = helpers;