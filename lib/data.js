const fs = require('fs');
const path = require('path');

const lib = {};

lib.baseDir = path.join(__dirname, '../.data/');

lib.create = function(dir, file, data, callback) {
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      fs.write(fileDescriptor, stringData, function(err) {
        if (!err) {
          fs.close(fileDescriptor, function(err) {
            callback(false);
          });
        } else {
          callback('Error writing to new file.');
        }
      });
    } else {
      callback('Could not create new file, it may already exist.');
    }
  });
}

lib.read = function(dir, file, callback) {
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8', function(err, data) {
    callback(err, data);
  });
}

lib.update = function(dir, file, data, callback) {
  fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      fs.truncate(fileDescriptor, function(err) {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, function(err) {
            if (!err) {
              fs.close(fileDescriptor, function(err) {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing the file.'); 
                }
              });
            } else {
              callback('Error writing the file.')
            }
          });
        } else {
          callback('Error truncating the file.');
        }
      });
    } else {
      callback('Could not open file for updating, it may not exist yet.');
    }
  });
}

lib.delete = function(dir, file, callback) {
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err) {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting the file.');
    }    
  })
}

module.exports = lib;