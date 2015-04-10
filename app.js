'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');
var app = require('./lib/app');

// Connect mongoose
if(!process.env.MONGODB_URI){
  console.log('You must set the MONGODB_URI environment varible.');
}
mongoose.connect(process.env.MONGODB_URI);

mongoose.set('debug', true);

var runAsync = function(){
  return app.updatePeopleAsync().then(function(){
    return Promise.delay(30000).then(runAsync);
  });
};

runAsync();