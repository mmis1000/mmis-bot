const mocha = require('mocha')
const coMocha = require('co-mocha')
const chai = require("chai")

coMocha(mocha)

var assert = chai.assert;

const Core = require("../").Core;
const Bot = require("../").Bot;
const Request = require("../").types.Request;
const Response = require("../").types.Response;
const User = require("../").types.User;
const Message = require("../").types.Message;

describe('Core', function() {
  describe('addHandle', function () {
    it('should add handle in same order', function () {
      var core = new Core();
      var fisrt = function*(){};
      var second = function(){};
      core.addHandle('test', fisrt);
      core.addHandle('test', second);
      assert.equal(core.paths.test[1], second);
    })
    it('should throw when handler is not function nor generator', function* () {
      var core = new Core();
      var err;
      try {
      core.addHandle('test', 'bad handle')
      } catch (e) {
        err = e;
      }
      assert.ok(err.message.match('not a generator function nor function'), 'not throw')
    })
  })
  describe('addHandleBefore', function () {
    it('should add handle in reverse order', function () {
      var core = new Core();
      var fisrt = function*(){};
      var second = function(){};
      core.addHandleBefore('test', fisrt);
      core.addHandleBefore('test', second);
      assert.equal(core.paths.test[0], second);
    })
    it('should throw when handler is not function nor generator', function* () {
      var core = new Core();
      var err;
      try {
      core.addHandleBefore('test', 'bad handle')
      } catch (e) {
        err = e;
      }
      assert.ok(err.message.match('not a generator function nor function'), 'not throw')
    })
  })
  describe('handle', function () {
    it('should handle the request', function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function () {
        count++;
      })
      core.addHandle('test', function* () {
        count++;
      })
      yield core.handle('test');
      assert.ok(count === 2, 'handle not run')
    })
    it('should forward the request argument',function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function (str) {
        assert(str === 'args0', 'incorrect argument');
        assert(arguments.length === 2, 'argument missing');
        count++;
      })
      core.addHandle('test', function* (str) {
        assert(str === 'args0', 'incorrect argument');
        assert(arguments.length === 2, 'argument missing');
        count++;
      })
      yield core.handle('test', 'args0');
      assert.ok(count === 2, 'handle not run')
    })
    it('should wait the request', function* () {
      var core = new Core();
      var now = Date.now();
      var count = 0;
      core.addHandle('test', function* () {
        yield new Promise(function (resolve) {
          if (count !== 0) throw new Error('mismatch order')
          count++;
          setTimeout(resolve, 100);
        })
      })
      core.addHandle('test', function* () {
        yield new Promise(function (resolve) {
          if (count !== 1) throw new Error('mismatch order')
          count++;
          setTimeout(resolve, 100)
        })
      })
      yield core.handle('test');
      assert.ok(count === 2, 'handle not run')
      assert.ok((Date.now() - now) > 150, 'handle not run in sequnece')
    })
    it('should catch the request when error', function * () {
      var core = new Core();
      var err;
      core.addHandle('test', function () {
        throw new Error('test message');
      })
      try {
        yield core.handle('test');
      } catch (e) {
        err = e;
      }
      assert.ok(err.message.match('test message'), 'error not throwen')
    })
    it('should catch the request when promise reject', function * () {
      var core = new Core();
      var err;
      core.addHandle('test', function* () {
        yield new Promise((resolve, reject)=>{
          reject(new Error('test message'))
        })
      })
      try {
        yield core.handle('test');
      } catch (e) {
        err = e;
      }
      assert.ok(err.message.match('test message'), 'error not throwen')
    })
    it('should terminate request when requested', function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function (flow) {
        count++;
        flow.terminate();
      })
      core.addHandle('test', function () {
        count++;
        throw new Error('fail to terminate');
      })
      yield core.handle('test');
      assert.ok(count === 1, 'not terminated properly')
    })
    it('should resume request when requested', function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function (flow) {
        count++;
        flow.terminate();
        flow.resume();
      })
      core.addHandle('test', function () {
        count++;
      })
      yield core.handle('test');
      assert.ok(count === 2, 'not resume properly')
    })
    it('should switch to other path when requested', function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function (flow) {
        count++;
        flow.switchPath('test2');
      })
      core.addHandle('test2', function () {
        count++;
      })
      yield core.handle('test');
      assert.ok(count === 2, 'path not switched properly')
    })
    it('should run other path when requested', function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function* (flow) {
        assert.ok(count === 0)
        count++;
        yield flow.runPath('test2');
      })
      core.addHandle('test2', function (flow) {
        assert.ok(count === 1)
        count++;
      })
      core.addHandle('test', function (flow) {
        assert.ok(count === 2)
        count++;
      })
      yield core.handle('test');
      assert.ok(count === 3, 'path not ran properly')
    })
  })
  describe('handleParallel', function () {
    it('should handle the request', function * () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function () {
        count++;
      })
      core.addHandle('test', function* () {
        count++;
      })
      yield core.handleParallel('test');
      assert.ok(count === 2, 'handle not run')
    })
    it('should forward the request argument',function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function (str) {
        assert(str === 'args0', 'incorrect argument');
        assert(arguments.length === 2, 'argument missing');
        count++;
      })
      core.addHandle('test', function* (str) {
        assert(str === 'args0', 'incorrect argument');
        assert(arguments.length === 2, 'argument missing');
        count++;
      })
      yield core.handleParallel('test', 'args0');
      assert.ok(count === 2, 'handle not run')
    })
    it('should wait the request at same time', function* () {
      var core = new Core();
      var now = Date.now();
      var count = 0;
      core.addHandle('test', function* () {
        yield new Promise(function (resolve) {
          count++;
          setTimeout(resolve, 100);
        })
      })
      core.addHandle('test', function* () {
        yield new Promise(function (resolve) {
          count++;
          setTimeout(resolve, 100)
        })
      })
      yield core.handleParallel('test');
      assert.ok(count === 2, 'handle not run')
      assert.ok((Date.now() - now) < 150, 'handle not run at same time')
    })
    it('should catch the request when error', function * () {
      var core = new Core();
      var err;
      core.addHandle('test', function () {
        throw new Error('test message');
      })
      try {
        yield core.handleParallel('test');
      } catch (e) {
        err = e;
      }
      assert.ok(err.message.match('test message'), 'error not throwen')
    })
    it('should catch the request when promise reject', function * () {
      var core = new Core();
      var err;
      core.addHandle('test', function* () {
        yield new Promise((resolve, reject)=>{
          reject(new Error('test message'))
        })
      })
      try {
        yield core.handleParallel('test');
      } catch (e) {
        err = e;
      }
      assert.ok(err.message.match('test message'), 'error not throwen')
    })
    it('should not able terminate request when requested', function* () {
      var core = new Core();
      core.addHandle('test', function (flow) {
        assert.throws(function () {
          flow.terminate()
        }, 'terminate is not possible when run parallel');
      })
      yield core.handleParallel('test');
    })
    it('should not able to resume request when requested', function* () {
      var core = new Core();
      core.addHandle('test', function (flow) {
        assert.throws(function () {
          flow.resume()
        }, 'resume is not possible when run parallel');
      })
      yield core.handleParallel('test');
    })
    it('should not able switch to other path when requested', function* () {
      var core = new Core();
      core.addHandle('test', function (flow) {
        assert.throws(function () {
          flow.switchPath()
        }, 'switchPath is not possible when run parallel');
      })
      yield core.handleParallel('test');
    })
    it('should run other path when requested', function* () {
      var core = new Core();
      var count = 0;
      core.addHandle('test', function* (flow) {
        assert.ok(count === 0)
        count++;
        yield flow.runPath('test2');
      })
      core.addHandle('test2', function (flow) {
        assert.ok(count === 1)
        count++;
      })
      yield core.handle('test');
      assert.ok(count === 2, 'path not ran properly')
    })
  })
})
describe('Request', function() {
  const bot = new Bot;
  const message = new Message({
    text: 'test text'
  });
  const user = new User({
    uid: 'test@test',
    id: 'test',
    tag: 'test',
    display: 'Tesssssssster'
  })
  const fakeSource = {hasPermission: ()=> {return Promise.resolve(true)}}
  const request = new Request( {
    isCommand: true,
    isText: true,
    message: message,
    originalArgs: ['test', 'text'],
    fullArgs: ['test', 'text'],
    args: ['test', 'text'],
    from: user,
    to: user,
    source: fakeSource,
    app: bot
  })
  it('should able to get text as a property', function() {
    assert.equal(request.text, message.text)
  })
  it('should able to get internal data of request by `data` getter', function () {
    assert.isNotNull(request.data);
  })
  // 'isCommand', 'isText', 'message', 'originalArgs', 'fullArgs', 'args', 'from', 'to'
  it('should forward these propery', function() {
    assert.isNotNull(request.isCommand);
    assert.isNotNull(request.isText);
    assert.isNotNull(request.message);
    assert.isNotNull(request.originalArgs);
    assert.isNotNull(request.fullArgs);
    assert.isNotNull(request.args);
    assert.isNotNull(request.from);
    assert.isNotNull(request.to);
  })
  it('should able to get permission level of current request from source if app did\'t handle it', function* (){
    assert.ok(yield request.hasPermission('global'))
  })
  it('should able to get permission level of current request from app', function* (){
    bot.addHandle('permission', function(req, level, flow) {
      flow.returnValue = false;
      flow.terminate();
    })
    assert.isNotOk(yield request.hasPermission('global'));
  })
  it('should able to make the request to string', function (){
    assert.equal('[Tesssssssster] Tesssssssster: test text', request + '')
  })
})
describe('Response', function() {
  const bot = new Bot;
  const message = new Message({
    text: 'test text'
  });
  const user = new User({
    uid: 'test@test',
    id: 'test',
    tag: 'test',
    display: 'Tesssssssster'
  })
  const fakeSource = {
    reply: (message)=> {return Promise.resolve(true)},
    question: (text, options)=> {return Promise.resolve([0, 'test question'])},
    inputText: (text)=>{return Promise.resolve('test input')}
  }
  const response = new Response({
    message: message,
    from: user,
    to: user,
    source: fakeSource,
    app: bot
  })
  it('should able to get internal data of request by `data` getter', function () {
    assert.isNotNull(response.data);
  })
  // 'from', 'to'
  it('should forward these propery', function() {
    assert.isNotNull(response.from);
    assert.isNotNull(response.to);
  })
  it('should reply', function*() {
    assert.equal(yield response.reply(''), true);
  })
  it('should question', function*() {
    assert.deepEqual(yield response.question('', []), [0, 'test question']);
  })
  it('should input', function*() {
    assert.equal(yield response.input(''), 'test input');
  })
})
describe('User', function() {
  describe('toString', function(){
    it('use display if it exist', function(){
      const user = new User({
        uid: 'test@test',
        id: 'test',
        tag: 'test',
        display: 'Tesssssssster'
      })
      assert(user.toString() === user.display)
    })
    it('use uid if display is not exist', function(){
      const user = new User({
        uid: 'test@test',
        id: 'test',
        tag: 'test'
      })
      assert(user.toString() === user.uid)
    })
    it('use id if uid is not exist', function(){
      const user = new User({
        id: 'test',
        tag: 'test'
      })
      assert(user.toString() === user.id)
    })
    it('use tag if id is not exist', function(){
      const user = new User({
        tag: 'test'
      })
      assert(user.toString() === user.tag)
    })
  })
})
describe('Bot', function() {
  const message = new Message({
    text: 'test text'
  });
  const user = new User({
    uid: 'test@test',
    id: 'test',
    tag: 'test',
    display: 'Tesssssssster'
  })
  const fakeSource = {
    hasPermission: ()=> {return Promise.resolve(true)},
    reply: (message)=> {return Promise.resolve(true)},
    question: (text, options)=> {return Promise.resolve([0, 'test question'])},
    inputText: (text)=>{return Promise.resolve('test input')}
  }
  /*
  const response = new Response({
    message: message,
    from: user,
    to: user,
    source: fakeSource,
    app: bot
  })
  const request = new Request( {
    isCommand: true,
    isText: true,
    message: message,
    originalArgs: ['test', 'text'],
    fullArgs: ['test', 'text'],
    args: ['test', 'text'],
    from: user,
    to: user,
    source: fakeSource,
    app: bot
  })*/
  describe('addHandles', function() {
    it('should be able to add raw handle', function() {
      var bot = new Bot();
      bot.addHandle('test', function(){})
      bot.addHandle('test', function*(){})
    })
    it('should throw when raw handle isn\'t function', function() {
      var bot = new Bot();
      assert.throws(function () {
        bot.addHandle('test', true)
      })
    })
    it('should has these short cut', function*() {
      var bot = new Bot();
      bot.whenGetUserFromUid(function(){});
      bot.whenMakeRequestToUid(function(){});
      yield bot.getUserFromUid();
      yield bot.makeRequestToUid();
    })
    it('should be able to prepend raw handle', function() {
      var bot = new Bot();
      bot.addHandleBefore('test', function(){})
      bot.addHandleBefore('test', function*(){})
    })
    it('should throw when prepended raw handle isn\'t function', function() {
      var bot = new Bot();
      assert.throws(function () {
        bot.addHandleBefore('test', true)
      })
    })
    it('should be able to add handle for command', function() {
      var bot = new Bot();
      bot.command(function(){})
      bot.command(function*(){})
      bot.command('test', function(){})
      bot.command('test', function*(){})
      bot.command(['test'], function(){})
      bot.command(['test'], function*(){})
    })
    it('should throw when command handle isn\'t function', function() {
      var bot = new Bot();
      assert.throws(function () {
        bot.command('test', true)
      })
    })
    it('should be able to add handle for help', function() {
      var bot = new Bot();
      bot.help(function(){})
      bot.help(function*(){})
      bot.help('test', function(){})
      bot.help('test', function*(){})
      bot.help(['test'], function(){})
      bot.help(['test'], function*(){})
    })
    it('should throw when help handle isn\'t function', function() {
      var bot = new Bot();
      assert.throws(function () {
        bot.help('test', true)
      })
    })
    it('should be able to add handle for use', function() {
      var bot = new Bot();
      bot.use('test', function(){})
      bot.use('test', function*(){})
    })
    it('should throw when use handle isn\'t function', function() {
      var bot = new Bot();
      assert.throws(function () {
        bot.use('test', true)
      })
    })
  })
  describe('handle command', function() {
    it('should not catch the command when it is not a command', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command('test', function(req, res){
        assert.deepEqual(req.args, ['arg'])
        a+=1
      })
      bot.command('test', function*(){
        throw new Error('fail to catch')
      })
      yield bot.run('main', request, response);
      assert.equal(a, 1);
    })
    it('should catch the command when path matchs', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command('test', function(req, res){
        assert.deepEqual(req.args, ['arg'])
        a+=1
      })
      bot.command('test', function*(){
        throw new Error('fail to catch')
      })
      yield bot.run('main', request, response);
      assert.equal(a, 1);
    })
    it('should resume the command when requested', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command('test', function(req, res, flow){
        assert.deepEqual(req.args, ['arg'])
        a+=1
        flow.resume();
      })
      bot.command('test', function*(){
        a+=1
      })
      yield bot.run('main', request, response);
      assert.equal(a, 2);
    })
    it('should also catch the command properly when handle is generator', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command('test', function* (req, res, flow){
        assert.deepEqual(req.args, ['arg'])
        yield new Promise(function(resolve) {
          setTimeout(function() {
            a+=1;
            resolve();
          }, 10)
        });
      })
      yield bot.run('main', request, response);
      assert.equal(a, 1);
    })
    it('should not catch the command when it is not a command', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: false,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command('test', function(req, res){
        a++;
        throw new Error('should not go here')
      })
      yield bot.run('main', request, response);
      assert.equal(a, 0);
    })
    it('should not catch the command when it is not a text message', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: false,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command('test', function(req, res){
        a++;
        throw new Error('should not go here')
      })
      yield bot.run('main', request, response);
      assert.equal(a, 0);
    })
    it('should catch the command when long path matchs', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.command(function(req, res, flow){
        assert.deepEqual(req.args, ['test', 'arg'])
        a+=1;
        flow.resume();
      })
      bot.command('test', function(req, res, flow){
        assert.deepEqual(req.args, ['arg'])
        a+=1
        flow.resume();
      })
      bot.command(['test', 'arg'], function(req, res, flow){
        assert.deepEqual(req.args, [])
        a+=1
        flow.resume();
      })
      bot.command(['test', 'arg', 'fail'], function*(){
        throw new Error('fail to catch')
      })
      yield bot.run('main', request, response);
      assert.equal(a, 3);
    })
    it('should catch the help when long path matchs', function*() {
      var bot = new Bot();
      const request = new Request( {
        isCommand: true,
        isText: true,
        message: message,
        originalArgs: ['test', 'arg'],
        fullArgs: ['test', 'arg'],
        args: ['test', 'arg'],
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      const response = new Response({
        message: message,
        from: user,
        to: user,
        source: fakeSource,
        app: bot
      });
      var a = 0
      bot.help(function(req, res, flow){
        assert.deepEqual(req.args, ['test', 'arg'])
        a+=1;
        flow.resume();
      })
      bot.help('test', function(req, res, flow){
        assert.deepEqual(req.args, ['arg'])
        a+=1
        flow.resume();
      })
      bot.help(['test', 'arg'], function(req, res, flow){
        assert.deepEqual(req.args, [])
        a+=1
        flow.resume();
      })
      bot.help(['test', 'fail'], function(req, res, flow){
        assert.deepEqual(req.args, [])
        a+=1
        flow.resume();
      })
      bot.help(['test', 'arg', 'fail'], function*(){
        throw new Error('fail to catch')
      })
      yield bot.run('help', request, response);
      assert.equal(a, 3);
    })
  })
})