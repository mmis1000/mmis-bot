module.exports = {
  Bot: require("./lib/bot"),
  Core: require("./lib/core"),
  IrcTouter: require("./lib/routers/irc_router"),
  utils: require("./lib/utils"),
  types: {
    Message: require("./lib/message/message"),
    Request: require("./lib/request/request"),
    Response: require("./lib/response/response"),
    User: require("./lib/users/user")
  }
}