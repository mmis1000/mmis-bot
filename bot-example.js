var Bot = require("./lib/bot");
var IrcCLient = require("./lib/clients/irc")

var bot = new Bot;

var ircCLient = new IrcCLient({
  nick: 'mmis_v2_bot',
  channels: ['#ysttd', '#ysitd']
});

ircCLient.bind(bot);

bot.command('help', function* (req, res, flow) {
  if (req.args.length === 1) {
    return res.reply('this command is used to show help message');
  }
  req.args.shift()
  flow.help();
})

bot.help('test', function* (req, res, flow) {
  res.reply('[tips] this is a example of help command');
})

bot.command('test', function* (req, res, flow) {
  var name = yield res.input('who are you? or type "help" for help')
  if (name === 'help') {
    return flow.help();
  }
  res.reply('hey ' + name);
  res.reply('how are you?');
  var number = yield res.input('what is 0.1 + 0.2 ?');
  if (number === '0.30000000000000004') {
    res.reply('Bot, go away!');
  } else if (number === '0.3') {
    res.reply('Hello, humen?');
  }
  var fruit = yield res.question('what is you favorite fruit?', ['apple', 'melon']);
  res.reply('your favorite fruiy is ' + fruit[0]);
})

var Router = require("./lib/router/router");
var router = new Router();
bot.use('main', router.middleware);

router.command('sub', function* (req, res, flow) {
  res.reply('this is example of sub command');
})

router.command('sub2', function* (req, res, flow) {
  res.reply('this is example of sub command 2');
})
router.command('sub3', function* (req, res, flow) {
  res.reply('this is example of sub command 3, but it does not catch it');
  flow.resume()
})

bot.command('main', function* (req, res, flow) {
  res.reply('does not used, so it fall through');
})