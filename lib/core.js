const co = require("co");
const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
const Q = require("q");
const PATH = Symbol('path');

class Flow {
  constructor(path) {
    this._path = path;
    this._terminated = false;
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
  run(path) {
    // force it to resume
    this._terminated = false;
    this._path = path;
  }
  get path () {
    return this._path;
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
          flow = new Flow(pathname);
      
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
          return;
        }
        // stop current stack if path changed
        if (flow.path !== pathname) {
          break;
        }
      }
      // jump to another path
      if (flow.path !== pathname) {
        yield this.handle(flow.path, ...args)
      }
    })
  }
  handleParallel(pathname, ...args) {
    var path = this[PATH](pathname);
    return Q.all(path.map(function (step) {
      if (step instanceof GeneratorFunction) {
        console.log(step, args);
        return co.call(this, step, ...args);
      } else {
        console.log(step, args);
        return Promise.resolve(step.call(this, ...args))
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

module.exports = Core;