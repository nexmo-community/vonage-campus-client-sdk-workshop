require('dotenv').config({
  path: __dirname + '/.env'
});
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const rug = require('username-generator')

const bot = require('./bot')


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

var activeConversationDetails;
app
  .route('/api/new')
  .get((req, res) => {
    if (activeConversationDetails) {
      res.json(activeConversationDetails)
    } else {


    }

  })

app
  .route('/webhooks/event')
  .post((req, res) => {
    console.log(req.body);


  })

app
  .route('/webhooks/answer')
  .get((req, res) => {
    console.log(req.body);
    var ncco = [{

    }]
    res.json(ncco)
  })

app.listen(process.env.PORT || 3000)
