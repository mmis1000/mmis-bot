const Core = require("../core");
const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
const co = require("co");

class Router {
  constructor () {
    var core = this.core = new Core;
    
    // make a short cut to pop help message
    core.addHandle('command', function (req, res, flow) {
      flow.help = flow.switchPath.bind(flow, 'help');
    }.bind(this))
    
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
  get middleware () {
    return this.run.bind(this);
  }
  run(req, res, flow) {
    return co.call(this, function*() {
      
      // rewrite the path and remove args prefix of parent layer
      var originalFullArgs = req.fullArgs;
      req.fullArgs = req.args.slice(0);
      /* 
       * check whether the request is catched
       * if it is, tell the parent layer the request is catched 
       */
      var subFlow = yield this.core.handle(flow.path, req, res);
      if (subFlow.terminated) {
        flow.terminate();
      }
      
      // restore the args
      req.fullArgs = originalFullArgs;
    })
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
}

module.exports = Router;