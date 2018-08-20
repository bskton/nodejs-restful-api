const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

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
        _data.read('users', phone, function(err, user) {
          if (!err && user) {
            _data.delete('users', phone, function(err) {
              if (!err) {
                const checks = sanitizeChecks(user.checks);
                const countChecksToDelete = checks.length;
                if (countChecksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  checks.forEach(function(checkId) {
                    _data.delete('checks', checkId, function(err) {
                      if (err) {
                        deletionErrors = true
                      }
                      checksDeleted++;
                      if (checksDeleted == countChecksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error: 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully.'
                          })
                        }
                      }
                    })
                  })
                } else {
                  callback(200);
                }
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

handlers.checks = function(data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
}

handlers._checks = {};

handlers._checks.post = function(data, callback) {
  const protocol = sanitizeProtocol(data.payload.protocol);
  const url = sanitize(data.payload.url);
  const method = sanitizeMethod(data.payload.method);
  const successCodes = sanitizeSuccessCodes(data.payload.successCodes);
  const timeoutSeconds = sanitizeTimeoutSeconds(data.payload.timeoutSeconds);

  if (protocol && url && method && successCodes && timeoutSeconds) {
    const token = sanitizeToken(data.headers.token);

    _data.read('tokens', token, function(err, token) {
      if (!err && token) {
        const phone = token.phone;

        _data.read('users', phone, function(err, user) {
          if (!err && user) {
            // @TODO: Use getter on user
            const checks = sanitizeChecks(user.checks);

            if (checks.length < config.maxChecks) {
              const checkId = helpers.createRandomString(20);

              const checkObject = {
                id: checkId,
                userPhone: phone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds
              }

              _data.create('checks', checkId, checkObject, function(err) {
                if (!err) {
                  // @TODO: addCheckToUser()
                  user.checks = checks;
                  user.checks.push(checkId);

                  _data.update('users', phone, user, function(err) {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: 'Could not add the check to the user data.'
                      })
                    }
                  })
                } else {
                  callback(500, {
                    Error: 'Could not create the new check.'
                  })
                }
              })
            } else {
              callback(400, {
                Error: 'The user already has the maximum number of checks (' + config.maxChecks +').'
              })
            }
          } else {
            callback(403);
          }
        })
      } else {
        callback(403);
      }
    })
  } else {
    callback(400, {
      Error: 'Missing required inputs or inputs are invalid.'
    })
  }
}

handlers._checks.get = function(data, callback) {
  const id = sanitizeCheckId(data.queryStringObject.id);

  if (id) {
    _data.read('checks', id, function(err, check) {
      if (!err && check) {
        // @TODO: Move authentication to subscriber
        const token = sanitizeToken(data.headers.token);

        handlers._tokens.verifyToken(token, check.userPhone, function(tokenIsValid) {
          if (tokenIsValid) {
            _data.read('users', check.userPhone, function(err, data) {
              if (!err && data) {
                callback(200, check);
              } else {
                callback(403, {
                  Error: 'Missing user data for provided token.'
                })
              }
            })
          } else {
            callback(403, {
              Error: 'Missing required token in header or the token is invalid.'
            })
          }
        })
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

handlers._checks.put = function(data, callback) {
  const id = sanitizeCheckId(data.payload.id);

  const protocol = sanitizeProtocol(data.payload.protocol);
  const url = sanitize(data.payload.url);
  const method = sanitizeMethod(data.payload.method);
  const successCodes = sanitizeSuccessCodes(data.payload.successCodes);
  const timeoutSeconds = sanitizeTimeoutSeconds(data.payload.timeoutSeconds);

  if (id) {
    if(protocol || url || method || successCodes || timeoutSeconds) {
      _data.read('checks', id, function(err, check) {
        if (!err && check) {
          // @TODO: Move authentication to subscriber
          const token = sanitizeToken(data.headers.token);

          handlers._tokens.verifyToken(token, check.userPhone, function(tokenIsValid) {
            if (tokenIsValid) {
              _data.read('users', check.userPhone, function(err, data) {
                if (!err && data) {
                  if (protocol) {
                    check.protocol = protocol;
                  }
                  if (url) {
                    check.url = url;
                  }
                  if (method) {
                    check.method = method;
                  }
                  if (successCodes) {
                    check.successCodes = successCodes;
                  }
                  if (timeoutSeconds) {
                    check.timeoutSeconds = timeoutSeconds;
                  }
                  _data.update('checks', id, check, function(err) {
                    if (!err) {
                      callback(200);
                    } else {
                      callback(500, {
                        Error: 'Could not update the check.'
                      })
                    }
                  })
                } else {
                  callback(403, {
                    Error: 'User does not exist for the provided token.'
                  })
                }
              })
            } else {
              callback(403, {
                Error: 'Missing required token in header or the token is invalid.'
              })
            }
          })
        } else {
          callback(404, {
            Error: 'Check not found.'
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
      Error: 'Missing required field. No check ID specified.'
    })
  }
}

handlers._checks.delete = function(data, callback) {
  const id = sanitizeCheckId(data.queryStringObject.id);

  if (id) {
    _data.read('checks', id, function(err, check) {
      if (!err && check) {
        const token = sanitizeToken(data.headers.token);
        handlers._tokens.verifyToken(token, check.userPhone, function(tokenIsValid) {
          if (tokenIsValid) {
            _data.delete('checks', id, function(err) {
              if (!err) {
                _data.read('users', check.userPhone, function(err, user) {
                  if (!err && user) {
                    const checks = sanitizeChecks(user.checks);
                    const checkPosition = checks.indexOf(id);
                    if (checkPosition > -1) {
                      checks.splice(checkPosition, 1);
                      _data.update('users', check.userPhone, user, function(err) {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error: 'Could not update user data.'
                          })
                        }
                      })
                    } else {
                      callback(500, {
                        Error: 'Could not find the check on the user object.'
                      })
                    }
                  } else {
                    callback(500, {
                      Error: 'Could not find the user who create the check.'
                    })
                  }
                })
              } else {
                callback(500, {
                  Error: 'Could not delete the check.'
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
          Error: 'The specified check ID does not exist.'
        })
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

function sanitizeCheckId(value) {
  // @TODO: Is it code duplication with sanitizeToken according to DDD?
  return typeof(value) == 'string' && value.trim().length == 20 ? value.trim() : false;
}

function sanitizeChecks(value) {
  return typeof(value) == 'object' && value instanceof Array ? value : [];
}

function sanitizeExtendToken(value) {
  return typeof(value) == 'boolean' && value == true ? true : false;
}

function sanitizeMethod(value) {
  return typeof(value) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(value) > -1 
    ? value : false;
}

function sanitizePhone(value) {
  return typeof(value) == 'string' && value.trim().length == 10 ? value.trim() : false;
}

function sanitizeTimeoutSeconds(value) {
  return typeof(value) == 'number' && value % 1 === 0 && value >= 1 && value <= 5 ? value : false;
}

function sanitizeToken(value) {
  return typeof(value) == 'string' && value.trim().length == 20 ? value.trim() : false;
}

function sanitizeTosAgreement(value) {
  return typeof(value) == 'boolean' && value == true ? true : false;
}

function sanitizeProtocol(value) {
  return typeof(value) == 'string' && ['http', 'https'].indexOf(value) > -1 ? value : false;
}

function sanitizeSuccessCodes(value) {
  return typeof(value) == 'object' && value instanceof Array && value.length > 0 ? value : false;
}

module.exports = handlers;