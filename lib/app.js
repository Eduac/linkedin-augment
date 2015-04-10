'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var models = require('greenlight-models');
var linkedinEx = require('linkedin-extractor');
var moment = require('moment');
var log = require('blikk-logjs')('app');

var Person = models.Person;

var App = function(options){
  // Wait this long between successive Linkedin fetches
  this.linkedinDelay = (options || {}).linkedinDelay || 10000;
};

App.prototype.updatePeople = function(callback){
  var app = this;
  log.info('updating people');
  app.findPeopleAsync().map(function(person){
    return Promise.delay(app.linkedinDelay).then(function(){
      return app.updatePersonAsync(person);
    });
  }, {concurrency: 1})
  .then(callback.bind(this, null))
  .catch(callback.bind(this));
};

// Finds people who have a Linkedin URL and w e have never augmented or we have not updated for more than 3 days.
App.prototype.findPeople = function(callback){
  var timeCutoff = moment().subtract(3, 'days').toDate();
  Person
    .where('linkedinUrl').exists()
    .where('linkedinUrl').ne('')
    .or([
      Person.where('metadata.linkedinLastFetched').exists(false)._conditions,
      Person.where('metadata.linkedinLastFetched').lt(timeCutoff)._conditions
    ])
    .exec(callback);
};

App.prototype.updatePerson = function(person, callback){
  linkedinEx.getFromUrlAsync(person.linkedinUrl).then(function(data){
    person.set({ linkedinUrl: data.publicProfileUrl });
    person.set({ description: data.summary });
    person.set({ 'metadata.linkedinProfile': data });
    person.set({ 'metadata.linkedinLastFetched': new Date() });
    return person.saveAsync();
  }).spread(function(newPerson){
    log.info({ id: newPerson._id }, 'updated person');
    callback(null, newPerson);
  }).catch(function(err){
    log.warn({ person: person, err: err }, 'failed to update person');
    callback(null, null);
  });
};

Promise.promisifyAll(App);
Promise.promisifyAll(App.prototype);

module.exports = new App();