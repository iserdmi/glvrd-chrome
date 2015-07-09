chrome.runtime.sendMessage({message: 'What text was in last time?'}, function(response) {
  localStorage.setItem("lastText", response.text);
});

$(function() {
  waiting_for_editor = setInterval(function() {
    if ($('.wysihtml5-sandbox').length) {
      clearInterval(waiting_for_editor);
      var $editor_body = $('.wysihtml5-sandbox').contents().find('body');
      $editor_body.on('keyup', function() {
        chrome.runtime.sendMessage({message: 'Set last text', text: $editor_body.html()});
      });
    }
  }, 1000);  
});