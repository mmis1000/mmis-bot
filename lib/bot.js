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
      flow.help = flow.switchPath.bind(flow, 'help');
    }.bind(this))
    
    // getUserFromUid(id, defer, flow);
    this.createLine('get_user_from_uid');
    
    // makeRequestToUid(id || User, oldRequest, oldResponse, defer, flow);
    this.createLine('make_request_to_uid');
    
    //command
    this.command = (...args)=>{
      this.addRequestHandle('command', true, ...args);
    }
    //help
    this.help = (...args)=>{
      this.addRequestHandle('help', true, ...args);
    }
    //use
    this.use = (...args)=>{
      this.addRequestHandle('command', false, ...args);
      this.addRequestHandle('help', false, ...args);
    }
  }
  /*
   * create [name] method and when[Name] method alias
   */
  createLine(name, isParallel){
    var runName = varname.camelback(name);
    var configureName = 'when' + varname.camelcase(name);
    this[runName] = function (...args) {
      if (!isParallel) {
        return this.run(runName, ...args);
      } else {
        return this.runParallel(runName, ...args);
      }
    }
    this[configureName] = function (func) {
      this.addHandle(configureName, func);
    }
  }
  
  _normalizeParams(arr){
    var path, handle, opts;
    if ('function' === typeof arr[0]) {
      path = [];
    } else {
      if (Array.isArray(arr[0])) {
        path = arr.shift();
      } else {
        path = [arr.shift()];
      }
    }
    handle = arr.shift();
    if ('function' !== typeof handle) {
      throw new Error('expected handle to be function')
    }
    opts = arr.shift() || {};
    return {path, handle, opts};
  }
  
  addRequestHandle(method, shoultTerminateByDefault, path, func, opts) {
    ({path, handle: func, opts} = this._normalizeParams([].slice.call(arguments, 2)));
    // console.log(this._normalizeParams([].slice.call(arguments, 2)));
    
    this.core.addHandle(method, function* (req, res, flow) {
      // make the help catch the help, so it won't pop to another site
      if (path.length > 0) {
        // when the user issued [a, b], but route asks to match [a,b,c]
        // in this case, it isn't possible to match
        if (path.length > req.fullArgs.length) return;
        for (let i = 0; i < path.length; i++) {
          if (path[i] !== req.fullArgs[i]) {
            // path mismatch;
            return;
          }
        }
      }
      if (shoultTerminateByDefault) {
        flow.terminate();
      }
      
      req.currentPrefix = path.slice(0);
      req.args = req.fullArgs.slice(path.length);
      
      if (func instanceof GeneratorFunction) {
        yield co.call(this, func, req, res, flow);
      } else if (func instanceof Function) {
        yield Promise.resolve(func.call(this, req, res, flow));
      }
    }.bind(this))
  }
  
  hasPermission(req, level) {
    return this.core.handle('permission', req, level)
    .then(function(flow) {
      return flow.returnValue;
    })
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