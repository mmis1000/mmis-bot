const co = require("co");
const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
const Q = require("q");
const PATH = Symbol('path');

class Flow {
  constructor(path, core) {
    this._core = core;
    this._path = path;
    this._terminated = false;
    
    this.returnValue = null;
  }
  terminate() {
    this._terminated = true;
  }
  resume() {
    this._terminated = false;
  }
  get terminated() {
    return this._terminated;
  }
  switchPath(path) {
    // force it to resume
    this._terminated = false;
    this._path = path;
  }
  get path() {
    return this._path;
  }
  
  // make it to run other path, but keeps the original one alive
  runPath (path, ...args) {
    return this._core.handle(path, ...args);
  }
  
}

class Core {
  constructor() {
    this.entry = null;
    this.paths = {
      main: []
    };
  }
  [PATH](pathname) {
    this.paths[pathname] = this.paths[pathname] || [];
    return this.paths[pathname];
  }
  /*
   * @description run the handlers in one by one manner
   * @param pathname{String}: the path to handle
   */
  handle(pathname, ...args) {
    var flow; 
    return co.call(this, function *(){
      var i, 
          p,
          flow = new Flow(pathname, this);
      
      var path = this[PATH](pathname);
      // main stack of this path
      for (i = 0; i < path.length; i++) {
        if (path[i] instanceof GeneratorFunction) {
          p = co.call(this, path[i], ...args, flow)
        } else {
          p = Promise.resolve(path[i].call(this, ...args, flow))
        }
        yield p;
        // terminate the whole execution
        if (flow.terminated) {
          return flow;
        }
        // stop current stack if path changed
        if (flow.path !== pathname) {
          return yield this.handle(flow.path, ...args)
        }
      }
      return flow;
    })
  }
  handleParallel(pathname, ...args) {
    var path = this[PATH](pathname),
        flow = new Flow(pathname, this);
    
    flow.terminate = ()=>{throw new Error('terminate is not possible when run parallel')};
    flow.resume = ()=>{throw new Error('resume is not possible when run parallel')};
    flow.switchPath = ()=>{throw new Error('switchPath is not possible when run parallel')};
    
    return Q.all(path.map(function (step) {
      if (step instanceof GeneratorFunction) {
        // console.log(step, args);
        return co.call(this, step, ...args, flow);
      } else {
        // console.log(step, args);
        return Promise.resolve(step.call(this, ...args, flow))
      }
    }))
  }
  addHandle(type, func) {
    if (!(func instanceof GeneratorFunction) && !(func instanceof Function)) {
      throw new Error('not a generator function nor function');
    }
    this[PATH](type).push(func);
  }
  addHandleBefore(type, func) {
    if (!(func instanceof GeneratorFunction) && !(func instanceof Function)) {
      throw new Error('not a generator function nor function');
    }
    this[PATH](type).unshift(func);
  }
}
Core.Flow = Flow;

module.exports = Core;