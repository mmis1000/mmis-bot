const co = require("co");
const DATA = Symbol("data");
const utils = require("../utils");
const defaultdata = {
  message: null,
  from: null,
  to: null,
  source: null,
  app: null
}
var exposeProperties = [
  'from', 'to'
]
class Response {
  constructor(data) {
    this[DATA] = Object.create(defaultdata)
    utils.mixin(data, this[DATA]);
    utils.proxyProperties(this[DATA], this, exposeProperties);
  }
  get data() {
    return this[DATA];
  }
  reply(message) {
    return co.call(this, function* (){
      return yield this[DATA].source.reply(
        this,
        message
      )
    })
  }
  question(text, options) {
    return co.call(this, function* (){
      return yield this[DATA].source.question(
        this,
        text,
        options
      )
    })
  }
  input(text) {
    return co.call(this, function* (){
      return yield this[DATA].source.inputText(
        this,
        text
      )
    })
  }
}
Response.symbols = {DATA};
module.exports = Response;