'use strict';

var Promise = require('bluebird');
var mongoose = require('mongoose');
var app = require('./lib/app');

// Connect mongoose
if(!process.env.MONGODB_URI){
  console.log('You must set the MONGODB_URI environment varible.');
}
mongoose.connect(process.env.MONGODB_URI);

if(!process.env.LINKEDIN_EMAIL){
  console.log('You must set the LINKEDIN_EMAIL environment varible.');
}
if(!process.env.LINKEDIN_PASSWORD){
  console.log('You must set the LINKEDIN_PASSWORD environment varible.');
}

mongoose.set('debug', true);

var runAsync = function(){
  return app.updatePeopleAsync().then(function(){
    return Promise.delay(30000).then(runAsync);
  });
};

app.loginAsync(process.env.LINKEDIN_EMAIL, process.env.LINKEDIN_PASSWORD).then(runAsync);