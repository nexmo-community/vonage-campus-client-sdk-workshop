import NexmoClient from 'nexmo-client';

var activeConversation;
var activeApplication;
var activeCall;

let messageId = 0;

function appendMessage(message, sender, appendAfter) {
  const messageDiv = document.createElement('div');
  messageDiv.classList = `message ${sender}`;
  messageDiv.innerHTML = '<span>' + message + '</span>';
  messageDiv.dataset.messageId = messageId++;

  const messageArea = document.getElementById('message-area');
  if (appendAfter == null) {
    messageArea.appendChild(messageDiv);
  } else {
    const inputMsg =
      document.querySelector(`.message[data-message-id="${appendAfter}"]`);
    inputMsg.parentNode.insertBefore(messageDiv, inputMsg.nextElementSibling);
  }

  // Scroll the message area to the bottom.
  messageArea.scroll({
    top: messageArea.scrollHeight,
    behavior: 'smooth'
  });

  // Return this message id so that a reply can be posted to it later
  return messageDiv.dataset.messageId;
}

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
          conversation
            .getEvents({
              page_size: 20
            })
            .then((events_page) => {
              events_page.items.forEach((value, key) => {
                if (value.type === "text") {
                  appendMessage(`${value.body.text}`, `${conversation.members.get(value.from).user.name==='bot' ? 'bot' : 'input'}`)
                }
              });

              setupListeners();
            })
            .catch(console.error);
        })
        .catch(console.error)
    });
}

function callAHuman() {
  activeApplication.callServer("447481738558")
}

function hangUp() {
  activeCall.hangUp().catch(console.log)
}

function setupListeners() {

  const form = document.getElementById('textentry');
  const textbox = document.getElementById('textbox');
  const speech = document.getElementById('speech');

  activeConversation.on("text", (sender, message) => {
    console.log(sender, message);
    appendMessage(message.body.text, `${sender.user.name==='bot' ? 'bot' : 'input'}`)
  })

  activeConversation.on("call-a-human", (sender, message) => {
    console.log(sender, message);
    appendMessage(`${message.body.text}`, `${sender.user.name}`)
    document.getElementById(message.body.buttonId).addEventListener("click", callAHuman)
  })

  activeApplication.on("call:status:changed", (call) => {
    if (call.status === "started") {
      activeCall = call;
      appendMessage(`☏ <button id='${call.id}'>Hang Up</button>`, "bot")
      document.getElementById(call.id).addEventListener("click", hangUp)
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();

    const inputText = textbox.value;

    activeConversation.sendText(inputText)

    textbox.value = '';
  }, false);

  appendMessage("👋! Hello, I can: <b>get the weather (⛅)</b> or <b>play Music (𝄞🥁𝄞)</b>", "bot")
}

window.addEventListener('load', function() {
  setupConversation();
});
