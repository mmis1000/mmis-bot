var Bot = require("./lib/bot");
var IrcRouter = require("./lib/routers/irc_router")

var bot = new Bot;

var ircRouter = new IrcRouter({
  nick: 'mmis_v2_bot',
  channels: ['#ysttd', '#ysitd']
});

ircRouter.app(bot);

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

