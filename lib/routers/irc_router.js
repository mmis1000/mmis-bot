const defaultOpts = {
  nick: 'my_replybot',
  server: 'chat.freenode.net',
  port: 6667,
  SASL: null,
  identifier: '*',
  channels: ['#test5566']
}

const Request = require("../request/request");
const Response = require("../response/response");
const Message = require("../message/message");
const User = require("../users/user");

const irc = require("irc");
const Q = require("q");
const co = require("co");
const INIT = Symbol('init');

class IrcRouter {
  constructor(opts) {
    this._opts = Object.create(defaultOpts);
    for (let key in opts) {
      this._opts[key] = opts[key]
    }
    this._app = null;
    this.inited = false;
    this.hookInputs = {}
    this._irc = irc;
  }
  app(app) {
    this._app = app;
    if (!this.inited) {
      this[INIT]();
      this.inited = true;
    }
  }
  [INIT]() {
    var options = {
      userName: this._opts.nick
    }
    if (this._opts.SASL) {
      options.userName = this._opts.SASL.account;
      options.password = this._opts.SASL.password;
    }
    var client = this._irc = new irc.Client(this._opts.server, this._opts.nick, {
      channels: this._opts.channels,
    });
    client.on('message', (from, to, text)=>{
      console.log(from + ' ' + to + ' ' + text)
      if (!to.match(/^#/)) {
        to = from;
      }
      // scanline
      if (this.hookInputs[to + ' ' + from]) {
        let temp = this.hookInputs[to + ' ' + from];
        delete this.hookInputs[to + ' ' + from];
        temp.resolve(text);
        return;
      }
      
      var fromUser = new User({
        uid: null,
        id: null,
        tag: from,
        display: from
      })
      var toUser = new User({
        uid: null,
        id: null,
        tag: to,
        display: to
      })
      var args, isCommand;
      if (text.indexOf(this._opts.identifier) === 0) {
        isCommand  = true;
        args = text.replace(this._opts.identifier, '');
        args = args.replace(/^\s+|\s+$/g, '').split(/\s+/g)
      } else {
        isCommand = false;
        args = text.replace(/^\s+|\s+$/g, '').split(/\s+/g)
      }
      
      var message = new Message({text});
      var request = new Request({
        isCommand,
        message,
        from: fromUser,
        to: toUser,
        source: this,
        args,
        app: this._app
      })
      var response = new Response({
        message,
        from: fromUser,
        to: toUser,
        source: this,
        app: this._app
      })
      this._app.run('main', request, response).catch((err)=>{
        console.error(err.stack || err);
      });
    })
  }
  scanline(channel, nick, timeout) {
    var defered = Q.defer()
    timeout = timeout || 60000;
    if (this.hookInputs[channel + ' ' + nick]) {
      defered.reject(new Error('already hooked'));
      return defered.promise;
    }
    this.hookInputs[channel.tag + ' ' + nick.tag] = defered;
    var id = setTimeout(function () {
      if (this.hookInputs[channel.tag + ' ' + nick.tag]) {
        this.hookInputs[channel.tag + ' ' + nick.tag].reject(new Error('scanline timeout'))
        delete this.hookInputs[channel.tag + ' ' + nick.tag]
      }
    }.bind(this), timeout)
    defered.promise.then(function () {
      clearTimeout(id);
    })
    return defered.promise;
  }
  reply(res, text) {
    return co.call(this, function*(){
      if (this._app) {
        yield this._app.run('send_message', res, text)
        this._irc.say(res.to.tag, text);
        yield this._app.run('post_send_message', res, text)
      }
    })
  }
  question(res, text, options) {
    return co.call(this, function* () {
      yield this.reply(res, text);
      for (let i = 0; i < options.length; i++) {
        yield this.reply(res, '(' + (i + 1) + ') ' + options[i])
      }
      var line
      while (line = yield this.scanline(res.to, res.from)) {
        line = Number(line);
        if (
          // can be parsed
          !isNaN(line) &&
          // is a int
          Math.floor(line) === line &&
          // between 1 ~ options.length
          line > 0 && 
          line <= options.length) {
          break;
        } else {
          yield this.reply(res, `please input option 1~${options.length}`);
        }
      }
      return [options[line - 1], line - 1]
    }.bind(this))
  }
  inputText(res, text) {
    return co.call(this, function* () {
      yield this.reply(res, text);
      return yield this.scanline(res.to, res.from)
    }.bind(this))
  }
}
module.exports = IrcRouter;