const Core = require("../core");
const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
const co = require("co");

class Router {
  constructor () {
    this.core = new Core;
  }
  get middleware () {
    return this.run.bind(this);
  }
  run(req, res, flow) {
    return co.call(this, function*() {
      var subFlow = yield this.core.handle(flow.path, req, res);
      if (subFlow.terminated) {
        flow.terminate();
      }
    })
  }
  command(name, func, opts) {
    if (!(func instanceof GeneratorFunction) && !(func instanceof Function)) {
      throw new Error('not a generator function nor function');
    }
    this.core.addHandle('command', function* (req, res, flow) {
      // make the command catch the command, so it won't pop to another site
      if (req.args[0] !== name) return;
      flow.terminate();
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
      if (req.args[0] !== name) return;
      flow.terminate();
      if (func instanceof GeneratorFunction) {
        yield co.call(this, func, req, res, flow);
      } else if (func instanceof Function) {
        yield Promise.resolve(func.call(this, req, res, flow));
      }
    }.bind(this))
  }
  use(name, func, opts) {
    if (!(func instanceof GeneratorFunction) && !(func instanceof Function)) {
      throw new Error('not a generator function nor function');
    }
    for (let path of ['command', 'help']) {
      this.core.addHandle(path, function* (req, res, flow) {
        if (req.args[0] !== name) return;
        // rewrite the path
        var originalArgs = req.args;
        req.args = originalArgs.slice(1);
        
        if (func instanceof GeneratorFunction) {
          yield co.call(this, func, req, res, flow);
        } else if (func instanceof Function) {
          yield Promise.resolve(func.call(this, req, res, flow));
        }
        // restore the args
        req.args = originalArgs;
      }.bind(this))
    }
  }
}

module.exports = Router;