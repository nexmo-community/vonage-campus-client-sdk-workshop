# Vonage Campus Workshop - Building a voice-enabled website using the Nexmo Client SDK


## Setup and Installation

Note: These instructions use `npm`, but you can use `yarn` instead of `npm run`, if you prefer `yarn`.

Install dependencies

```
npm install
```

## Run Ngrok

If you haven't downloaded ngrok before you can do so now at https://ngrok.com/download

Once you have ngrok, we'll run it on port 3000:

```
ngrok http 3000
```

This will start a tunnel between localhost:3000 and the ngrok servers, and give you a publicly accessible URL. We'll use this URL with the Nexmo application, so we can receive events from Nexmo.

## Create a Nexmo Application

### Install the beta version of the Nexmo CLI

```
npm install -g nexmo-cli@beta
```

You'll have to setup the CLI with your API key and secret. You can find those in your account in the [Nexmo Dashboard](https://dashboard.nexmo.com/getting-started-guide)

```
nexmo setup API_KEY API_SECRET
```

### Create a Voice and RTC enabled Nexmo Application

The CLI has two ways you can accomplish this. Interactive mode or the more verbose direct command. The interactive mode also outputs the verbose direct command if you need to run this in the future.

```
nexmo app:create
```

This runs the CLI with interactive mode. We'll be asked for the name of our application, for example `Campus Conversations`. For Capabilities select `voice` and `rtc`. For the URLs, use the ngrok URL, followed by `/webhooks/answer` and `/webhooks/event` for the Answer URL and Event URLs respectively. We'll leave the Fallback Answer URL and public key fields blank. We'll also save the private key file on disk, to `private.key.`

The output should look similar to this:

```
>nexmo app:create
? Application Name:  Campus Conversations
? Select Capabilities:  voice, rtc
? Use the default HTTP methods?  Yes
? Voice Answer URL: http://laka.ngrok.io/webhooks/answer
? Voice Fallback Answer URL: Optional
? Voice Event URL: http://laka.ngrok.io/webhooks/event
? RTC Event URL: http://laka.ngrok.io/webhooks/event
? Public Key path: Leave empty if you don't want to use your own public key.
? Private Key path: private.key
Application created: b9ca8fc1-c321-4fa9-8a8c-40b76ec9e948
Credentials written to /Users/laka/vonage-campus-client-sdk-workshop/.nexmo-app

To recreate this application in the future without interactive mode use the following command:

nexmo app:create "Campus Conversations" --capabilities=voice,rtc --voice-answer-url=http://laka.ngrok.io/webhooks/answer --voice-event-url=http://laka.ngrok.io/webhooks/event --rtc-event-url=http://laka.ngrok.io/webhooks/event --keyfile=private.key

Private Key saved to: /Users/laka/vonage-campus-client-sdk-workshop/private.key
```

### Create a User on the Nexmo Application

We'll need to manually create a user in the Nexmo application, for the bot to use. We can do this via the CLI:

```
nexmo user:create name=bot
```

The output returns the User ID and looks similar to this:

```
User created: USR-7ddf69a7-bc4f-4460-bac3-da25488b5a36
```

### Update the environment file

There is an `example.env` file in the repo we cloned, we'll need to update the values in there with the things we created in the steps above. For the `SUPPORT` number, input your mobile phone number. Rename the file once you're done to `.env`:

```
NEXMO_API_KEY=API_KEY
NEXMO_API_SECRET=API_SECRET
NEXMO_APPLICATION_ID=b9ca8fc1-c321-4fa9-8a8c-40b76ec9e948
NEXMO_APPLICATION_PRIVATE_KEY_PATH=./private.key
SUPPORT=447481731234
BOT_USER=USR-7ddf69a7-bc4f-4460-bac3-da25488b5a36
```


## Run the app

The bot and models are pre-trained, so you can use the following command to run the demo app.

```
npm run workshop
```

This should run the `server.js` file with `node` on port 3000, build the client JavaScript using parcel and then open the client application at http://localhost:1234/ in your default browser.

Let's take a look a what the app does now. It is a chat application that allows you to talk to a bot. You can ask it things like `How's the weather in San Francisco`. If you ask it about things the bot has no answer to, you'll get a default generic message. The application is built using Vanilla JavaScript, without any third party integrations. Let's take a look at the files, and see what's already there:

- `server.js` - I've already setup an Express server listening on port 3000, that implements a few routes:
  - `/api/new` - this is the part that sets up the Conversation API parts that we'll use to build the chat application further. It creates a random User on the Nexmo Application, then creates a Conversation, adds the user it just created to the Conversation, and then adds the bot User we created in the beginning into the same Conversation.
  - `/webhooks/event` - this is a placeholder for the Event URL we gave our Nexmo Application when we created it, and for now logs the incoming events.
  - `/webhooks/answer` - this is a placeholder for the Answer URL we gave our Nexmo Application when we created it, and for now outputs a JSON response.
- `app/index.js` - I've also built a chat interface using Vanilla JavaScript that lets you append messages to the chat window. The bot picks up those messages, computes an answer and appends it back into the chat window. The chat has no persistence, so once you refresh the page, everything is lost.

## Re-build the app

We'll take this code, and replace the chat part with the Nexmo Client SDK, as well as convert the default bot message to prompt you to call a human when it fails to understand your query.

### Replace Chat functionality with the Nexmo Client SDK
 Let's start by updating the Chat functionality to use the Nexmo Client SDK. Open `app/index.js` in your preferred IDE and add the Nexmo Client SDK at the top of the file:

 ```javascript
 import NexmoClient from 'nexmo-client';
 ```

 Now we can start using the Client SDK. The first thing we need to do to be able to interact with it fully is `login()` with a JSON Web Token(JWT). The JWT is generated on the server, in the `/api/new` route, so we'll need to fetch that information, and use it to login. After logging in, the SDK returns information about the Nexmo application you're using. That allows us to interact with it. We'll also save it to an object so we can interact with it from other parts of our code.

 From the application, we'll need to retrieve the Conversation we're using for this Chat, so we'll call `getConversation` on the app, with the Conversation ID provided from the server. After we've successfully retrieved the conversation, we'll save this in an object, so we can reference it in other parts of the code. I've wrapped this whole logic into a function called `setupConversation`, so let's add that to the `index.js` file you're editing:

 ```javascript
 var activeConversation;
 var activeApplication;

 function setupConversation() {
   fetch('http://localhost:3000/api/new')
     .then(function(response) {
       return response.json();
     })
     .then(function(response) {
       new NexmoClient({
           debug: false
         })
         .login(response.jwt)
         .then(app => {
           console.log('*** Logged into app', app)
           activeApplication = app;
           return app.getConversation(response.conversation.id)
         })
         .then(conversation => {
           console.log('*** Retrieved conversations', conversation);
           activeConversation = conversation;
           setupListeners();
         })
         .catch(console.error)
     });
 }
 ```

 You've probably noticed that after we save the conversation, we're calling `setupListeners`, one of the functions already implemented in the file we're editing. That changes the logic flow of the application a bit, `setupListeners` was being called already when the window `load` event was triggered. So we'll need to update that part of the code as well (it's at the bottom of the file) to call `setupConversation` when the window loads instead of `setupListeners`.

 ```javascript
 window.addEventListener('load', function() {
   setupConversation();
 });
 ```

 ### Sending and receiving messages

 We've successfully added the Client SDK to our application, but you'll notice we haven't replaced the sending and receiving messages part of the application yet. We'll do that now.

 We've been using the `sendMessage` function to append the message to the Chat window, give the text to the bot, and append the reply to the Chat window as well.

 We'll replace that functionality to send the message to the Nexmo Conversation instead. Replace `sendMessage(inputText);` in the `setupListeners` function to use `activeConversation.sendText(inputText)` instead. That will send a `text` event into the Conversation.

 ```javascript
 function setupListeners() {
   ...

   form.addEventListener('submit', event => {
     ...
     activeConversation.sendText(inputText)
     ...
   }, false);
 }
 ```

The Conversation is one big Event BUS, so all the events that go into the Conversation (like `sendText`) are distributed to all the Members in the Conversation. If we're sending a `text` event into the Conversation, we should also listen for text events coming from the conversation. Let's add a listener in the same `setupListeners` function, to listen for text events on the `activeConversation`, and then append the messages to the chat window. The text event has information about the sender and the message being sent, so we can attribute the messages to user input or the bot.

```javascript
function setupListeners() {
  ...
  activeConversation.on("text", (sender, message) => {
    console.log(sender, message);
    appendMessage(message.body.text, `${sender.user.name==='bot' ? 'bot' : 'input'}`)
  })
  ...
}
```

We're not using the `sendMessage` funtion anymore, and we can go ahead and delete the whole function declaration from `index.js`. `sendMessage` was the only place where we were calling our bot, so we can remove the bot import from the top of the file as well.

### Move the bot to the Server

We've removed the bot from the client code, and that means we've temporarily lost some functionality. Now we're only able to send and receive messages into the chat, but the bot doesn't reply to our messages. We'll re-implement the bot functionality on the server-side now.

The `server.js` file already implements a route for `/webhooks/event`, where Nexmo sends all the events happening in our application, implicitly the conversation as well. We'll update that route now to look for `text` events coming from the user, send them to the bot we're using, and then create a text event in the Conversation with the response message from the bot.

```javascript
app
  .route('/webhooks/event')
  .post((req, res) => {
    console.log(req.body);

    if (req.body.from != botMember && req.body.type === 'text') {
        bot.getMessage(req.body.body.text).then(response => {
          nexmo.conversations.events.create(req.body.conversation_id, {
            type: "text",
            from: botMember,
            body: {
              text: response
            }
          })
        }).catch(console.error)
    }
  })
```

We've now successfully replaced our chat functionality to use the Nexmo Client SDK. The client application is rebuilding itself as we update the code, but the server needs to be re-started when we make changes. You'll need to stop the running app and run `npm run workshop` again to see the changes.

If you've tested the application, you'll see that there is a slight delay between loading the window and being able to interact with the chat, and that's because we didn't add any load indicators to it. We'll do that now, and replace the static message from the index file with one dinamically added to the chat window once the Conversation has been setup and we can interact with it.

Go to the `app/index.html` file, and remove the message div from inside the `message-area`. We'll add this in the `index.js` file instead, at the end of the `setupListeners` function, after our Conversation is fully loaded and the events listeners are setup.

```javascript
function setupListeners() {
  ...
  appendMessage("👋! Hello, I can: <b>get the weather (⛅)</b> or <b>play Music (𝄞🥁𝄞)</b>", "bot")
}
```

## Update the app

We've now successfully replaced our chat functionality to use the Nexmo Client SDK and improved the user experience. We can improve the user experience further. You'll notice the bot is not very smart, and can't return weather information for more out of the way locations. You can test this out with a query like "What's the weather in Hateg" (Hateg being my hometown in Romania). The bot will reply with ⛅, the default message when there's no information. We will change this to improve the user experience, and offer the user a chance to call a human in this instance.

### Create custom events

Let's change the server side event we generate in the Conversation, to something else in that instance. The conversation has a number of pre-set events. There isn't one that would work for this specific example, and if we send a regular text event, we'd have to add a bunch of logic on the client to interpret that message and offer UI for calling a human. Because we recognise there isn't one size fits all when it comes to Conversations, we've added the ability to have custom events in a Conversation. So we'll send a `custom:call-a-human` event instead of the `text` event when the bot doesn't have a response. That way we can listen specifically for it in the client UI, without having to do a lot of logic there.

Let's replace the `/webhooks/event` route in the server to first look at the message from the bot, and decide if it's sending a text event or a custom event in the Conversation.

The custom event must start with `custom:`, and have the custom name appended after that, so we'll use `custom:call-a-human`. We specify the sender as the bot, and then we can add our own object in the body of the event. For this one, I've decided to send HTML as the text, and generate a random id for the button, also passing the `buttonId` along as a property. That means it's going to be easier for us when we update the client with this functionality.

```javascript
app
  .route('/webhooks/event')
  .post((req, res) => {
    console.log(req.body);

    if (req.body.from != botMember && req.body.type === 'text') {
        bot.getMessage(req.body.body.text).then(response => {
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
    }
  })
```

We can listen for this custom event in the client as well, so let's update the `app/index.js` file. The `setupListeners` function already has a method to listen for text events in the conversation, let's add another listener for `call-a-human` events.

```javascript
function setupListeners() {
  ...
  activeConversation.on("call-a-human", (sender, message) => {
    console.log(sender, message);
    appendMessage(`${message.body.text}`, `${sender.user.name}`)
    document.getElementById(message.body.buttonId).addEventListener("click", callAHuman)
  })
  ...
}
```

We're appending the message to the chat window, and we're adding a `click` event listener for the button we get from the server. That's going to call the `callAHuman` function, which we haven't implemented yet.

### Add calling capabilities

We'll implement the calling capabilities to our application. There are 2 parts needed for this to work, one is the Client SDK method `callServer` that exists on the Nexmo application. This takes a string parameter, and the validation requires it to be a phone number format. Let's implement the `callAHuman` function we're using in the custom event.

```javascript
function callAHuman() {
  activeApplication.callServer("447481738558")
}
```

When this function is called, the Nexmo application makes a GET request to the Answer URL we declared, and takes the NCCO from there to control the call. The way it's working no, we'll hear a Text to Speech prompt telling us "Thank you for calling a human, none is available at the moment.". Because it gets that NCCO, we can add the calling logic in there. So let's update the `` route in our `server.js` file to expand on this, and actually call a human.

```javascript
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
          number: process.env.SUPPORT
        }]
      }
    ]
    res.json(ncco)
  })
```

If you've attended the Voice workshop today, you've learned all about NCCOs and the capabilities there. If you didn't, the `connect` action will connect the phone call to a phone number, so you can have a call with a human.

If you run the app now, you'll notice we don't have the ability to end the call from our web application. We can add that functionality now. The Nexmo Application issues events, same as the Conversation, and we can listen for those events as well. Whenever the status of a call changes, there is an `call:status:changed` event being fired on the application, that has information about the current status of the call. We'll check to see when the call has started, and add UI to the chat window for hanging up the call. Let's append the listener in the `setupListeners` function in `app/index.js`.

```javascript
var activeCall;
function setupListeners() {
  ...
  activeApplication.on("call:status:changed", (call) => {
    if (call.status === "started") {
      activeCall = call;
      appendMessage(`☏ <button id='${call.id}'>Hang Up</button>`, "bot")
      document.getElementById(call.id).addEventListener("click", hangUp)
    }
  });
  ...
}
```

We're saving a reference to the call in an object so we can interact with it from other parts of our application. We're also appending a button to the chat window to hang up a call, adding an `click` event listener to it.

We still need to implement the `hangUp` method, so let's do that now. The Nexmo Call object has a `hangUp` method on it, that hangs up the current call, so we'll use that.

```javascript
function hangUp() {
  activeCall.hangUp().catch(console.log);
}
```

We'll need to restart the whole application for the server changes to take place, so if we run `npm run workshop` again, we'll be able to see the full application and interact with it.



## [Debugging] Preparing training data

The training data is all pre-run, but if you want to re-train the model or use different intents, there are four npm/yarn scripts listed in package.json for preparing the training data. Each writes out one of more new files.

The two scripts needed to train the intent classifier are:

1. `npm run raw-to-csv`: Converts the raw data into a csv format
2. `npm run csv-to-tensors`: Converts the strings in the CSV created in step 1 into tensors.

The two scripts needed to train the token tagger are:

1. `npm run raw-to-tagged-tokens`: Extracts tokens from sentences in the original data and tags each token with a category
2. `npm run tokens-to-embeddings`: embeds the tokens from the queries using the universal sentence encoder and writes out a look-up-table.

You can run all four of these commands with

```
npm run prep-data
```

You only need to do this once. This process can take 2-5 minutes on the smaller data sets and up to an hour on the full data set. The output of these scripts will be written to the `training/data` folder.

## [Debugging] Train the models

If you need to re-train the intent classifier model run:

```
npm run train-intent
```

To train the token tagging model run:

```
npm run train-tagger
```

Each of these scripts take multiple options, look at `training/train-intent.js` and `training/train-tagger.js` for details.

These scripts will output model artifacts in the `training/models` folder.

You can run all two of these commands with

```
npm run train
```
