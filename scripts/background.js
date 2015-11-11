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
    case 'Which state of locking?':
      var
        locking_state = localStorage.getItem('locking_state');
      if (locking_state === undefined) {
        locking_state = false;
        localStorage.setItem('locking_state', locking_state);
      }
      sendResponse({
        locking_state: locking_state
      });
      break;
    case 'We want change locking state':
      var
        locking_state = localStorage.getItem('locking_state');
      if (locking_state === undefined) {
        locking_state = false;        
      }
      locking_state = !locking_state;
      localStorage.setItem('locking_state', locking_state);
      sendResponse({
        locking_state: locking_state
      });
      break;
    case 'Set last text':
      localStorage.setItem('last_text', data.text);
      break;
  }
});