'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var models = require('greenlight-models');
var linkedinEx = require('linkedin-extractor');
var moment = require('moment');
var log = require('blikk-logjs')('app');

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
var Person = models.Person;

var App = function(options){
  // Wait this long between successive Linkedin fetches
  this.linkedinDelay = (options || {}).linkedinDelay || 1000;
};

App.prototype.login = function(email, password, callback){
  linkedinEx.login(email, password, callback);
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

App.prototype.linkedinToProfile = function(linkedinProfile){
  // Skills
  var skills = _.uniq(_.pluck(linkedinProfile.skills, 'skill'));
  // Education
  var educationTemplate = _.template(
    '{{schoolName}} - {{fieldOfStudy}}, {{degree}} ({{startDate.year}} - {{endDate.year}})');
  var education = _.map(linkedinProfile.education, function(e){
    _.defaults(e, { 
      fieldOfStudy: 'Unknown Field of Study',
      degree: 'Unknown Degree',
      startDate: { year: 'Unknown' },
      endDate: { year: 'Unknown' }
    });
    return educationTemplate(e);
  });
  // Experience
  var experienceTemplate = _.template('{{title}}, {{company}} ({{startDate}} - {{endDate}})');
  var experience = _.map(linkedinProfile.experience, function(e){
    _.defaults(e, { startDate: 'Unknown', endDate: 'Unknown' });
    return experienceTemplate(e);
  });
  var location = linkedinProfile.location;
  var jobTitle = _.result(_.findWhere(linkedinProfile.experience, { isCurrent: true }), 'title');
  var result = {
    description: linkedinProfile.summary,
    skills: skills,
    education: education,
    experience: experience,
    location: location,
    jobTitle: jobTitle
  };
  return _(result).omit(_.isEmpty).omit(_.isNull).omit(_.isUndefined).value();
};

App.prototype.updatePerson = function(person, callback){
  var app = this;
  linkedinEx.getFromUrlAsync(person.linkedinUrl).then(function(data){
    person.set({ linkedinUrl: data.publicProfileUrl });
    var profileUpdate = app.linkedinToProfile(data);
    person.set(profileUpdate);
    person.set({ 'metadata.linkedinProfile': data });
    person.set({ 'metadata.linkedinLastFetched': new Date() });
    return person.saveAsync();
  }).spread(function(newPerson){
    log.info({ id: newPerson._id }, 'updated person');
    callback(null, newPerson);
  }).catch(function(err){
    log.warn({ person: person, err: err, errStatus: err.status, errResponse: err.response }, 'failed to update person');
    callback(null, null);
  });
};

Promise.promisifyAll(App);
Promise.promisifyAll(App.prototype);

module.exports = new App();