const crypto = require('crypto');
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

module.exports = helpers;