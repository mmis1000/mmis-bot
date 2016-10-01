const mocha = require('mocha')
const coMocha = require('co-mocha')
const chai = require("chai")

coMocha(mocha)

var assert = chai.assert;

const Core = require("../").Core;
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