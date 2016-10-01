const co = require("co");
const DATA = Symbol("data");
const utils = require("../utils");
const defaultData = {
  isCommand: true,
  isText: true,
  message: null,
  originalArgs: [],
  fullArgs: [],
  args: [],
  from: null,
  to: null,
  source: null,
  app: null
}
var exposeProperties = [
  'isCommand', 'isText', 'message', 'originalArgs', 'fullArgs', 'args', 'from', 'to'
]

class Request {
  constructor(data) {
    this[DATA] = Object.create(defaultData)
    utils.mixin(data, this[DATA]);
    this[DATA].originalArgs = this[DATA].fullArgs = this[DATA].args;
    utils.proxyProperties(this[DATA], this, exposeProperties);
  }
  get text(){
    return this.message.toString();
  }
  get data() {
    return this[DATA];
  }
  hasPermission(level) {
    var data = this.data;
    return co.apply(this, function*(){
      if (data.app && data.app.hasPermission(this, level)) {
        return true
      }
      return yield data.source.hasPermission(data.from. data.to, level);
    })
  }
  toString() {
    return `[${this.data.to.toString()}] ${this.data.from.toString()}: ${this.data.message.toString()}`
  }
  simulateSendTo(message, target) {
    
  }
}
Request.symbols = {DATA};
module.exports = Request;