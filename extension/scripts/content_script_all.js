chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
  switch (data.message) {
    case 'Give me selection':
      sendResponse({
        text: window.getSelection().toString().trim()
      });
      break;
    case 'Push variable to console log':
      console.log(data.variable);
      break;
  }
});