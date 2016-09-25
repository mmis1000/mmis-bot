function proxyProperties(from, to , list) {
  for (let val of list) {
    ((val)=>{
      Object.defineProperty(to, val, {
        enumerable: true,
        get: function () { return from[val]; } ,
        set: function (newValue) { from[val] = newValue; } 
      });
    })(val)
  }
}
function mixin(from, to) {
  for (let key in from) {
    if (from.hasOwnProperty(key)) {
      to[key] = from[key];
    }
  }
}
module.exports = {
  proxyProperties,
  mixin
}