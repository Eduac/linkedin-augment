'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var expect = require('chai').expect;
var sinon = require('sinon');
var linkedinEx = require('linkedin-extractor');
var app = require('../lib/app');
var mongoose = require('mongoose');
var Person = require('greenlight-models').Person;

mongoose.set('debug', true);
mongoose.connect(process.env.MONGODB_URI);

describe('The application', function(){

  var sandbox = sinon.sandbox.create();
  var samplePerson = {
    name: { first: 'Denny', last: 'Britz' }
  };

  beforeEach(function(){
    sandbox.restore();
    return Person.remove({});
  });

  describe('#findPeople', function(){

    it('should not return people with no linkedin URLs', function(){
      return new Person(_.assign({}, samplePerson)).saveAsync()
      .then(function(person){
        return app.findPeopleAsync();
      }).then(function(people){
        expect(people.length).to.eql(0);
      });
    });

    it('should not return people with empty linkedin URLs', function(){
      return new Person(_.assign({}, {linkedinUrl: ''})).saveAsync()
      .then(function(person){
        return app.findPeopleAsync();
      }).then(function(people){
        expect(people.length).to.eql(0);
      });
    });

    it('should not return people that have not been processed within 3 days', function(){
      return new Person(_.assign({}, {
        linkedinUrl: 'https://www.linkedin.com/in/studentsample',
        'metadata.linkedinLastFetched': new Date(+new Date() - 1000*60*60*24*2)
      })).saveAsync()
      .then(function(person){
        return app.findPeopleAsync();
      }).then(function(people){
        expect(people.length).to.eql(0);
      });
    });    

    it('should return people that have never been processed before', function(){
      return new Person(_.assign({}, {linkedinUrl: 'https://www.linkedin.com/in/studentsample'})).saveAsync()
      .then(function(person){
        return app.findPeopleAsync();
      }).then(function(people){
        expect(people.length).to.eql(1);
      });
    });

    it('should return people that have not been processed for more than 3 days', function(){
      return new Person(_.assign({}, {
        linkedinUrl: 'https://www.linkedin.com/in/studentsample',
        'metadata.linkedinLastFetched': new Date(+new Date() - 1000*60*60*24*5)
      })).saveAsync()
      .then(function(person){
        return app.findPeopleAsync();
      }).then(function(people){
        expect(people).to.be.an.array;
        expect(people.length).to.eql(1);
      });
    });

  });
  
  describe('#updatePerson', function(){

    var personRecord = null;

    beforeEach(function(){
      return new Person(_.assign({}, {
        linkedinUrl: 'https://www.linkedin.com/in/studentsample'
      })).saveAsync().spread(function(person){
        personRecord = person;
      });
    });

    it('should update the person reocrd in the datatabase', function(){
      sandbox.stub(linkedinEx, 'getFromUrl').yields(null, { description: 'Hello World' });
      return app.updatePersonAsync(personRecord).then(function(newPerson){
        expect(newPerson.metadata.linkedinLastFetched.getTime()).to.be.closeTo(+ new Date(), 100);
        expect(newPerson.metadata.linkedinProfile).to.eql({
          description: 'Hello World'
        });
      });
    });

  });


  describe('#updatePeople', function(){

    this.timeout(8000);

    beforeEach(function(){
      return Promise.all([
        new Person(_.assign({}, samplePerson, { linkedinUrl: 'https://www.linkedin.com/in/studentsample' })).saveAsync(),
        new Person(_.assign({}, samplePerson, { linkedinUrl: 'https://www.linkedin.com/in/studentsample' })).saveAsync(),
        new Person(_.assign({}, samplePerson, { linkedinUrl: 'https://www.linkedin.com/in/studentsample' })).saveAsync()
      ]);
    });

    it('should update the person reocrd in the datatabase', function(){
      sandbox.stub(linkedinEx, 'getFromUrl').yields(null, { description: 'Hello World' });
      return app.updatePeopleAsync().then(function(newPeople){
        expect(newPeople.length).to.eql(3);
      });
    });

  });  


});