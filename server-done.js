require('dotenv').config({
  path: __dirname + '/.env'
});
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const rug = require('username-generator')

const bot = require('./bot')

const Nexmo = require('nexmo')
var nexmo = new Nexmo({
  apiKey: process.env.NEXMO_API_KEY,
  apiSecret: process.env.NEXMO_API_SECRET,
  applicationId: process.env.NEXMO_APPLICATION_ID,
  privateKey: process.env.NEXMO_APPLICATION_PRIVATE_KEY_PATH
});

var botMember;

const acl = {
  "paths": {
    "/*/users/**": {},
    "/*/conversations/**": {},
    "/*/sessions/**": {},
    "/*/devices/**": {},
    "/*/image/**": {},
    "/*/media/**": {},
    "/*/applications/**": {},
    "/*/push/**": {},
    "/*/knocking/**": {}
  }
};


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/models', express.static('./training/models'))

app
  .route('/api/jwt/:user')
  .get((req, res) => {
    const jwt = Nexmo.generateJwt(process.env.NEXMO_APPLICATION_PRIVATE_KEY_PATH, {
      application_id: process.env.NEXMO_APPLICATION_ID,
      sub: req.params.user,
      exp: new Date().getTime() + 86400,
      acl: acl
    })
    res.json({
      jwt: jwt
    })
  })

var activeConversationDetails;
app
  .route('/api/new')
  .get((req, res) => {
    if (activeConversationDetails) {
      res.json(activeConversationDetails)
    } else {
      nexmo.users.create({
        name: rug.generateUsername("-")
      }, (error, user) => {
        if (error) console.log(error)

        if (user) {
          nexmo.conversations.create({
            display_name: rug.generateUsername()
          }, (error, conversation) => {
            if (error) console.log(error)

            if (conversation) {
              nexmo.conversations.members.add(conversation.id, {
                "action": "join",
                "user_id": user.id,
                "channel": {
                  "type": "app"
                }
              }, (error, member) => {
                if (error) console.log(error)

                if (member) {
                  nexmo.conversations.members.add(conversation.id, {
                    "action": "join",
                    "user_id": process.env.BOT_USER,
                    "channel": {
                      "type": "app"
                    }
                  }, (error, bot) => {
                    if (error) console.log(error)
                    const jwt = Nexmo.generateJwt(process.env.NEXMO_APPLICATION_PRIVATE_KEY_PATH, {
                      application_id: process.env.NEXMO_APPLICATION_ID,
                      sub: member.name,
                      exp: new Date().getTime() + 86400,
                      acl: acl
                    })
                    if (bot) {
                      botMember = bot.id;
                      activeConversationDetails = {
                        user,
                        conversation,
                        member,
                        bot,
                        jwt
                      }
                      res.json(activeConversationDetails)
                    }
                  })
                }
              })
            }
          })
        }
      })
    }

  })

app
  .route('/api/bot')
  .get((req, res) => {
    const inputText = "what's the weather in singapore"
    bot.classify([inputText]).then(classification => {
      bot.getClassificationMessage(classification, inputText).then(response => {
        res.json({
          response
        })
      }).catch(console.error)
    }).catch(console.error)
    // Add the response to the chat window
  })

app
  .route('/webhooks/event')
  .post((req, res) => {
    console.log(req.body);

    if (req.body.from != botMember && req.body.type === 'text') {
      bot.classify([req.body.body.text]).then(classification => {
        bot.getClassificationMessage(classification, req.body.body.text).then(response => {
          if (response === '⛅') {
            var buttonId = rug.generateUsername("_")
            nexmo.conversations.events.create(req.body.conversation_id, {
              type: "custom:call-a-human",
              from: botMember,
              body: {
                text: `${response} I'm not smart enough to know that. Do you want to <button id="${buttonId}">Call a Human</button>?`,
                buttonId: buttonId
              }
            })
          } else {
            nexmo.conversations.events.create(req.body.conversation_id, {
              type: "text",
              from: botMember,
              body: {
                text: response
              }
            })
          }
        }).catch(console.error)
      }).catch(console.error)
    }
  })

app
  .route('/webhooks/answer')
  .get((req, res) => {
    console.log(req.body);
    var ncco = [{
        action: 'talk',
        text: 'Thank you for calling a human, none is available at the moment.'
      },
      {
        action: 'connect',
        endpoint: [{
          type: 'phone',
          number: '447481738558'
        }]
      }
    ]
    res.json(ncco)
  })

app.listen(process.env.PORT || 3000)