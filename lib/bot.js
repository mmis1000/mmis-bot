const Core = require("./core");
const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
const co = require("co");
const varname = require('varname');

class Bot {
  constructor() {
    var core = this.core = new Core;
    core.addHandle('main', function* (req, res) {
      yield core.handleParallel('message', req, res)
    }.bind(this))
    core.addHandle('message', function*(req, res) {
      yield core.handleParallel('pre_command', req, res);
      if (!req.isText) return;
      if (!req.isCommand) return;
      yield core.handle('command', req, res);
    }.bind(this))
    
    // make a short cut to pop help message
    core.addHandle('command', function (req, res, flow) {
      flow.help = flow.run.bind(flow, 'help');
    }.bind(this))
    
    // getUserFromUid(id, defer);
    this.createLine('get_user_from_uid');
    
    // makeRequestToUid(id || User, oldRequest, oldResponse, defer);
    this.createLine('make_request_to_uid');
  }
  /*
   * create [name] method and when[Name] method alias
   */
  createLine(name, isParallel){
    var runName = varname.camelback(name);
    var configureName = 'when' + varname.camelcase(name);
    this[runName] = function (...args) {
      if (!isParallel) {
        this.run(runName, ...args);
      } else {
        this.runParallel(runName, ...args);
      }
    }
    this[configureName] = function (func) {
      this.addHandle(configureName, func);
    }
  }
  command(name, func, opts) {
    if (!(func instanceof GeneratorFunction) && !(func instanceof Function)) {
      throw new Error('not a generator function nor function');
    }
    this.core.addHandle('command', function* (req, res, flow) {
      // make the command catch the command, so it won't pop to another site
      flow.terminate();
      if (req.args[0] !== name) return;
      if (func instanceof GeneratorFunction) {
        yield co.call(this, func, req, res, flow);
      } else if (func instanceof Function) {
        yield Promise.resolve(func.call(this, req, res, flow));
      }
    }.bind(this))
  }
  help(name, func, opts) {
    if (!(func instanceof GeneratorFunction) && !(func instanceof Function)) {
      throw new Error('not a generator function nor function');
    }
    this.core.addHandle('help', function* (req, res, flow) {
      // make the help catch the help, so it won't pop to another site
      flow.terminate();
      if (req.args[0] !== name) return;
      if (func instanceof GeneratorFunction) {
        yield co.call(this, func, req, res, flow);
      } else if (func instanceof Function) {
        yield Promise.resolve(func.call(this, req, res, flow));
      }
    }.bind(this))
  }
  hasPermission(req, level) {
    return this.core.handle('permission', req, level)
  }
  run(path, ...args) {
    return this.core.handle(path, ...args);
  }
  runParallel(path, ...args) {
    return this.core.handleParallel(path, ...args);
  }
  addHandle(type, func) {
    return this.core.addHandle(type, func.bind(this));
  }
  addHandleBefore(type, func) {
    return this.core.addHandleBefore(type, func.bind(this));
  }
}

module.exports = Bot;