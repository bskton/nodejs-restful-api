const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.ping = function(data, callback) {
  callback(200);
}

handlers.notFound = function(data, callback) {
  callback(404);
}

handlers.users = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
}

handlers._users = {};

handlers._users.post = function(data, callback) {
  // Required data: firstName, lastName, phone, password, tosAgreement
  const firstName = sanitize(data.payload.firstName);
  const lastName = sanitize(data.payload.lastName);
  const phone = sanitizePhone(data.payload.phone);
  const password = sanitize(data.payload.password);
  const tosAgreement = sanitizeTosAgreement(data.payload.tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement) {
    _data.read('users', phone, function(err, data) {
      if (err) {
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          const user = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true
          }
  
          _data.create('users', phone, user, function(err) {
            if (!err) {
              callback(200);
            } else {
              const msg = 'Could not craete the new user.';
              console.log(msg, err);
              callback(400, {
                Error: msg
              })
            }
          })
        } else {
          callback(500, {
            Error: 'Could not hash the user\'s password.'
          })
        }
      } else {
        callback(400, {
          Error: 'A user with that phone number already exists.'
        })
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required fields.'
    });
  }
}

// @TODO: Only let an authenticated users access their object.
handlers._users.get = function(data, callback) {
    const phone = sanitizePhone(data.queryStringObject.phone);
    if (phone) {
      _data.read('users', phone, function(err, data) {
        if (!err && data) {
          // Don't show hashed password anybody
          delete data.hashedPassword;
          callback(200, data);
        } else {
          callback(404);
        }
      })
    } else {
      callback(400, {
        Error: 'Missing required field.'
      })
    }
}

// @TODO: Only let an authenticated users update their object.
handlers._users.put = function(data, callback) {
  const phone = sanitizePhone(data.payload.phone);
  console.log('phone', phone);

  if (phone) {
    const firstName = sanitize(data.payload.firstName);
    const lastName = sanitize(data.payload.lastName);
    const password = sanitize(data.payload.password);

    if (firstName || lastName || password) {
      _data.read('users', phone, function(err, user) {
        if (!err && user) {
          user.firstName = firstName ? firstName : user.firstName;
          user.lastName = lastName ? lastName : user.lastName;
          user.hashedPassword = password ? helpers.hash(password) : user.password;

          _data.update('users', phone, user, function(err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {
                Error: 'Could not update the user.'
              })
            }
          })
        } else {
          callback(400, {
            Error: 'The specified user does not exist.'
          })
        }
      })
    } else {
      callback(400, {
        Error: 'Missing fields to update.'
      })
    }
  } else {
    callback(400, {
      Error: 'Missing required field.'
    })
  }
}

// @TODO: Only let an authenticated users delete their object.
handlers._users.delete = function(data, callback) {
  const phone = sanitizePhone(data.queryStringObject.phone);

  if (phone) {
    _data.read('users', phone, function(err, data) {
      if (!err && data) {
        _data.delete('users', phone, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, {
              Error: 'Could not delete the user.'
            })
          }
        })
      } else {
        callback(404, {
          Error: 'Could not find the user.'
        });
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required field.'
    })
  }
}

function sanitize(value) {
  return typeof(value) == 'string' && value.trim().length > 0 ? value.trim() : false;
}

function sanitizePhone(value) {
  return typeof(value) == 'string' && value.trim().length == 10 ? value.trim() : false;
}

function sanitizeTosAgreement(value) {
  return typeof(value) == 'boolean' && value == true ? true : false;
}

module.exports = handlers;