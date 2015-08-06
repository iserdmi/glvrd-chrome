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
  }
});