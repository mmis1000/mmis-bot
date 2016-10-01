module.exports = {
  Bot: require("./lib/bot"),
  Core: require("./lib/core"),
  IrcClient: require("./lib/clients/irc"),
  utils: require("./lib/utils"),
  Router: require("./lib/router/router"),
  types: {
    Message: require("./lib/message/message"),
    Request: require("./lib/request/request"),
    Response: require("./lib/response/response"),
    User: require("./lib/users/user")
  }
}