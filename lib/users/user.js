var utils = require("../utils");
class User{
  constructor(opts){
    this.uid = null;
    this.id = null;
    this.tag = null;
    this.display = null;
    utils.mixin(opts, this);
  }
  toString() {
    if (this.display) {
      return this.display;
    }
    if (this.uid) {
      return this.uid
    }
    if (this.id) {
      return this.id
    }
    if(this.tag) {
      return this.tag;
    }
  }
}
module.exports = User;