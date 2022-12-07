import Browser, { cookies } from "webextension-polyfill";

async function run(question, onMessage) {
  const port = Browser.runtime.connect();
  port.onMessage.addListener(onMessage);
  port.postMessage({ question });
}

const outEls = {};
let idCounter = 0;

function getElementId(el) {
  const ATTRIBUTE_NAME = 'gpt-check-id';
  if (!el.hasAttribute("gpt-check-id")) {
    let id = idCounter++ + '';
    el.setAttribute(ATTRIBUTE_NAME, id);
    return id;
  } else {
    return el.attributes[ATTRIBUTE_NAME].value;
  }
}

function getOutElement(el) {
  const elId = getElementId(el);
  if (elId in outEls) {
    return outEls[elId];
  } else {
    const outEl = document.createElement("div");
    outEls[elId] = outEl;
    outEl.classList.add("gpt-check-result-class");
    outEl.classList.add("hidden");
    document.body.appendChild(outEl);
    return outEl;
  }
}

function makeOutput(answer, onClose) {
  const controls = document.createElement("div");
  controls.classList.add('gpt-check-out-controls');
      
  const copy = document.createElement("span");
  copy.innerHTML = 'Copy';
  const listener = () => {           
    var data = [new ClipboardItem({ "text/plain": new Blob([answer], { type: "text/plain" }) })];
    navigator.clipboard.write(data);
    copy.innerHTML = 'Copied!';
    copy.removeEventListener('click', listener)
    copy.style = "cursor: default; text-decoration: none;";
  };
   copy.addEventListener('click', listener);


  const close = document.createElement("span");
  close.innerHTML = 'Close';
  close.addEventListener('click', onClose);

  controls.appendChild(copy);
  controls.appendChild(close);
    
  return controls;
}

function checkGPT(button) {
  document.querySelectorAll('.DraftEditor-root').forEach(el => {
    const content = el.textContent;
    if (content && content !== 'What’s happening?' && content !== 'Tweet your reply' && !button.hasAttribute("gpt-check-loading")) {
      const outEl = getOutElement(el);

      const buttonBB = button.getBoundingClientRect();
      const inputBB = el.getBoundingClientRect();
      const w = inputBB.width * 0.8;
      
      outEl.style.width = `${w}px`;
      outEl.style.top =  `${buttonBB.bottom}px`;
      outEl.style.left =  `${buttonBB.left - w/2}px`;
      
      outEl.innerHTML = '';
      outEl.classList.add('hidden');
      button.innerHTML = '<div class="spinner"></div>'
      button.setAttribute("gpt-check-loading", "");

      const prompt = `I want you to help me improve my tweet. I want you to only reply with a single improved tweet, and nothing else. Do not write explanations. My tweet is: \n ${content}`;
      
      // setTimeout(() => {
      //   const answer = `Confused about "large deviation theory" vs "extreme value theory"? You're not alone! My colleague frequently mixes them up too. Let's learn more about these important topics together.`;
      //   button.removeAttribute("gpt-check-loading");
      //   button.innerHTML = 'GPT';
      //   outEl.classList.remove('hidden');

      //   outEl.innerHTML = `<i>${answer}</i>`;
      //   const onClose = () => { outEl.classList.add('hidden'); };
      //   outEl.appendChild(makeOutput(answer, onClose));
      // }, 1);
      console.log(prompt);
      run(prompt, (msg) => {
        console.log(msg);

        button.removeAttribute("gpt-check-loading");
        button.innerHTML = 'GPT';
        outEl.classList.remove('hidden');
        if (msg.answer) {
          const answer = msg.answer;
          outEl.innerHTML = `<i>${msg.answer}</i>`;
          button.removeAttribute("gpt-check-loading");
          button.innerHTML = 'GPT';
          outEl.classList.remove('hidden');

          outEl.innerHTML = `<i>${answer}</i>`;
          const onClose = () => { outEl.classList.add('hidden'); };
          outEl.appendChild(makeOutput(answer, onClose));
        } else if (msg.error === "UNAUTHORIZED") {
          outEl.innerHTML = '<p>Please login at <a href="https://chat.openai.com" target="_blank">chat.openai.com</a> first</p>';
        } else {
          outEl.innerHTML = "<p>Failed to load response from ChatGPT</p>";
        }
      });
    }
  });
}

setInterval(function() {
  const ATTRIBUTE_NAME = 'gpt-check-enabled';
  const toolbars = document.querySelectorAll('[data-testid="toolBar"]');
  
  toolbars.forEach(tb => {
    if (!tb.hasAttribute(ATTRIBUTE_NAME)) {
      tb.setAttribute(ATTRIBUTE_NAME, true);

      const checkButton = document.createElement("div");
      checkButton.classList.add('gpt-check-button');
      checkButton.innerHTML = 'GPT';
      checkButton.addEventListener('click', () => checkGPT(checkButton));

      tb.firstChild.appendChild(checkButton);
    }
  });
}, 500);

