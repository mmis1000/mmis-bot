var utils = require("../utils");
class Message {
  constructor(opts){
    this.text = null;
    utils.mixin(opts, this)
  }
  toString() {
    return this.text.toString();
  }
}
module.exports = Message;