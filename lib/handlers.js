const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

const ONE_HOUR = 1000 * 60 * 60;

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

handlers._users.get = function(data, callback) {
    const phone = sanitizePhone(data.queryStringObject.phone);
    if (phone) {
      // @TODO: Use handlers.getToken()
      const token = sanitizeToken(data.headers.token);
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if (tokenIsValid) {
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
          callback(403, {
            Error: 'Missing required token in header or the token is invalid.'
          })
        }
      })
    } else {
      callback(400, {
        Error: 'Missing required field.'
      })
    }
}

handlers._users.put = function(data, callback) {
  const phone = sanitizePhone(data.payload.phone);
  if (phone) {
    // @TODO: Use handlers.getToken()
    const token = sanitizeToken(data.headers.token);
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
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
        callback(403, {
          Error: 'Missing required token in header or the token is invalid.'
        })
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required field.'
    })
  }
}

handlers._users.delete = function(data, callback) {
  const phone = sanitizePhone(data.queryStringObject.phone);
  if (phone) {
    // @TODO: Use handlers.getToken()
    const token = sanitizeToken(data.headers.token);
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
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
        callback(403, {
          Error: 'Missing required token in header or the token is invalid.'
        })
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required field.'
    })
  }
}

handlers.tokens = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
}

handlers._tokens = {};

handlers._tokens.post = function(data, callback) {
  const phone = sanitizePhone(data.payload.phone);
  const password = sanitize(data.payload.password);

  if (phone && password) {
    _data.read('users', phone, function(err, user) {
      if (!err && user) {
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == user.hashedPassword) {
          const tokenId = helpers.createRandomString(20);
          if (tokenId) {
            const expires = Date.now() + ONE_HOUR;
            const token = {
              phone: phone,
              id: tokenId,
              expires: expires
            };
            _data.create('tokens', tokenId, token, function(err) {
              if (!err) {
                callback(200, token);
              } else {
                callback(500, {
                  Error: 'Could not create a new token.'
                });
              }
            })
          } else {
            callback(500, {
              Error: 'Could not crate a new token ID.'
            })
          }
        } else {
          callback(400, {
            Error: 'Wrong password.'
          })
        }
      } else {
        callback(400, {
          Error: 'Could not find the user.'
        })
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required fields.'
    })
  }
}

handlers._tokens.get = function(data, callback) {
  const id = sanitizeToken(data.queryStringObject.id);
    if (id) {
      _data.read('tokens', id, function(err, data) {
        if (!err && data) {
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

handlers._tokens.put = function(data, callback) {
  const id = sanitizeToken(data.payload.id);
  const extend = sanitizeExtendToken(data.payload.extend);

  if (id && extend) {
    _data.read('tokens', id, function(err, token) {
      if (!err && token) {
        if (token.expires > Date.now()) {
          token.expires = Date.now() + ONE_HOUR;
          _data.update('tokens', id, token, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: 'Could not update the token\'s expiration.'
              })
            }
          })
        } else {
          callback(400, {
            Error: 'The token has already expired and can not be extended'
          })
        }
      } else {
        callback(400, {
          Error: 'The token does not exist.'
        })
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required fields or fields are invalid.'
    })
  }
}

handlers._tokens.delete = function(data, callback) {
  const id = sanitizeToken(data.queryStringObject.id);

  if (id) {
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        _data.delete('tokens', id, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, {
              Error: 'Could not delete the token.'
            })
          }
        })
      } else {
        callback(404, {
          Error: 'Could not find the token.'
        });
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required field.'
    })
  }
}

handlers._tokens.verifyToken = function(id, phone, callback) {
  _data.read('tokens', id, function(err, token) {
    if (!err && token) {
      if (token.phone == phone && token.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  })
}

function sanitize(value) {
  return typeof(value) == 'string' && value.trim().length > 0 ? value.trim() : false;
}

function sanitizePhone(value) {
  return typeof(value) == 'string' && value.trim().length == 10 ? value.trim() : false;
}

function sanitizeToken(value) {
  return typeof(value) == 'string' && value.trim().length == 20 ? value.trim() : false;
}

function sanitizeTosAgreement(value) {
  return typeof(value) == 'boolean' && value == true ? true : false;
}

function sanitizeExtendToken(value) {
  return typeof(value) == 'boolean' && value == true ? true : false;
}

module.exports = handlers;