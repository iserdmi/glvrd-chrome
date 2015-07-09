function log(variable) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {'message': 'Push variable to console log', 'variable': variable});
  });
}

chrome.contextMenus.create({
  "title": "Отправить в Главред",
  "contexts": ["selection"],
  "onclick": function(info) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {'message': 'Give me selection'}, function(response) {
        localStorage.setItem('last_text', response.text.replace(/(?:\r\n|\r|\n)/g, '<br>'));
        chrome.tabs.create({ url: 'http://glvrd.ru' });
      });
    });
  }
});

chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
  switch (data.message) {
    case 'What text was in last time?':
      sendResponse({
        text: localStorage.getItem('last_text')
      });
      break;
    case 'Set last text':
      localStorage.setItem('last_text', data.text);
      break;
    case 'Give me last glvrd.js file':
      sendResponse({
        file_content: localStorage.getItem('glvrd_js')
      });
      break;
  }
});

function get_last_glvrd_js() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "http://api.glvrd.ru/v1/glvrd.js", true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      var file_content = xhr.responseText;
      if (file_content && (file_content.indexOf('ion()') !== -1)) {
        localStorage.setItem('glvrd_js', file_content);
      } else {
        setTimeout(function() {
          get_last_glvrd_js();
        }, 1000);
      }
    }
  }
  xhr.send();
}

get_last_glvrd_js();
setInterval(get_last_glvrd_js, 1000*60*60*24);