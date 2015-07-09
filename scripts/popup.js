$(function() {
  var
    min_textarea_height = 100,
    global_editor,
    global_sentences = 0,
    global_words = 0,
    global_chars = 0,
    global_waiting_for_user = false,
    global_want_to_check = false,
    global_current_status = 'waiting',
    $textarea_wrap = $('#textarea_wrap'),
    $info = $('#info'),
    $body = $('body'),
    $head = $('head'),
    $textarea = $textarea_wrap.find('#textarea'),
    $stats = $info.find('.stats'),
    $rule = $info.find('.rule'),
    $rule_title = $rule.find('.title'),
    $rule_description = $rule.find('.description'),
    $welcome = $info.find('.welcome'),
    $error = $info.find('.error'),
    $error_title = $error.find('.title'),
    $error_description = $error.find('.description'),
    $stats_score = $stats.find('.stats-score'),
    $stats_score_suffix = $stats.find('.stats-score-suffix'),
    $stats_sentences = $stats.find('.stats-sentences'),
    $stats_sentences_suffix = $stats.find('.stats-sentences-suffix'),
    $stats_words = $stats.find('.stats-words'),
    $stats_words_suffix = $stats.find('.stats-words-suffix'),
    $stats_chars = $stats.find('.stats-chars'),
    $stats_chars_suffix = $stats.find('.stats-chars-suffix'),
    $stats_stopwords = $stats.find('.stats-stopwords'),
    $stats_stopwords_suffix = $stats.find('.stats-stopwords-suffix'),
    $send_to_glvrd = $stats.find('.send_to_glvrd'),
    $editor_error_css = $('<link>').attr('rel', 'stylesheet').attr('href', 'styles/editor_error.css'),
    $glvrd_js,
    $editor_iframe,
    $editor_body,
    $editor_head;

  function resize_textarea() {
    $editor_body.css({
      'min-height': 0,
      'overflow': 'hidden',
    });
    var 
      scroll_height = $editor_body[0].scrollHeight,
      body_height = $editor_body.height(),
      new_height = Math.min(scroll_height, body_height);
    if (min_textarea_height > new_height) {
      new_height = min_textarea_height;
    }
    $textarea_wrap.height(new_height);
  }

  function set_text(text) {
    set_last_text(text);
    global_editor.setValue(text);
    var $cursor_position = $editor_body.find('i');
    if ($cursor_position.length) {
      global_editor.composer.selection.selectNode($cursor_position.first()[0]);
      $cursor_position.remove();
    }
  }

  function get_raw_text() {
    $editor_body.find('i').remove();
    global_editor.composer.selection.insertNode($("<i></i>")[0]);
    return global_editor.getValue();
  }

  function get_clear_text() {
    var 
      text = get_raw_text();
      tmp = document.createElement("DIV");
    tmp.innerHTML = text;
    return tmp.textContent || tmp.innerText || "";
  }

  function get_text_for_glvrd(text) {
    if (text === undefined) {
      text = get_raw_text();
    }
    text = text.replace(/<em[^>]*>/g, '');
    text = text.replace(/<\/em>/g, '');
    return text;
  }

  function normalize_textarea() {
    var text = get_raw_text();
    text = text.replace(/(<font[^>]*>|<\/font>)/g, '');
    set_text(text);
  }

  function shit_happens(error_code, message) {    
    var 
      title = '',
      description = '';
    set_status('error');
    switch (error_code) {
      case 'failed_request':
        title = 'Расширение Главред не работает';
        description = message;
      default:
        title = 'Расширение Главред не работает';
        description = 'Скоро проблема решится. А пока прошу вас использовать сайт <a href="http://glvrd.ru" target="_blank">Главреда</a>';
    }
    $error_title.html(title);
    $error_description.html(description);
  }
  window.sh = shit_happens;

  function get_word_for_num(num, zero_word, one_word, two_word) {
    if ((num > 4) && (num < 21)) {
      return zero_word;
    }
    var last_num = (num + '').slice(-1);
    switch (last_num) {
      case '1':
        return one_word;
      case '2':
      case '3':
      case '4':
        return two_word;
      default:
        return zero_word;
    }
  }

  function update_text_stats() {
    var
      text = get_clear_text(),
      global_sentences = text.match(/(\.( |$))|([^\.\s]+$)/gm);
    global_words = text.replace(/[А-Яа-яA-Za-z0-9-]+([^А-Яа-яA-Za-z0-9-]+)?/g, ".");
    global_chars = text.replace(/[^А-Яа-яA-Za-z0-9-\s.,()-]+/g, "");
    global_sentences = (global_sentences) ? global_sentences.length : 0;
    global_words = (global_words) ? global_words.length : 0;
    global_chars = (global_chars) ? global_chars.length : 0;
    $stats_sentences.text(global_sentences);
    $stats_sentences_suffix.text(get_word_for_num(global_sentences, 'предложений', 'предложение', 'предложения'));
    $stats_words.text(global_words);
    $stats_words_suffix.text(get_word_for_num(global_words, 'слов', 'слово', 'слова'));
    $stats_chars.text(global_chars);
    $stats_chars_suffix.text(get_word_for_num(global_chars, 'знаков', 'знак', 'знака'));
  }

  function insert_into_string(string, position, injection) {
    if (position > 0) {
      return string.substring(0, position) + injection + string.substring(position, string.length);
    } else {
      return injection + string;
    }    
  }

  function user_activity() {
    if (global_waiting_for_user) {
      clearTimeout(global_waiting_for_user);
    } 
    global_waiting_for_user = setTimeout(function() {
      global_waiting_for_user = false;
      if (global_want_to_check) {
        global_want_to_check = false;
        check_text();
      }
    }, 1800); 
  }

  function is_text_ready_to_update() {
    return !global_waiting_for_user;
  }

  function check_text_later() {
    global_want_to_check = true;
  }

  function set_last_text(text) {
    text = text || get_raw_text();
    chrome.runtime.sendMessage({message: 'Set last text', text: text});
  }

  function get_last_text(callback) {
    chrome.runtime.sendMessage({message: 'What text was in last time?'}, function(response) {
      callback(response.text);
    });
  }

  function set_status(status) {
    if (global_current_status === 'error') {
      if (status !== 'waiting') {
        return;
      } else {
        $error.removeClass('active');
        $editor_error_css.detach();
      }
    } else if (status === 'error') {
      $error.addClass('active');
      $editor_error_css.appendTo($editor_head);
      var waiting_glvr_rise = setInterval(function() {
        glvrd.getStatus(function(result) {
          if (result.status === 'ok') {
            clearInterval(waiting_glvr_rise);
            set_status('waiting');
            update_status();
          }
        });
      }, 2000);
    }
    global_current_status = status;
    $body
      .removeClass('status-rule status-waiting status-stats status-welcome status-error')
      .addClass('status-' + status);
    return status;
  }
  window.ss = set_status;

  function get_status() {
    return global_current_status;
  }

  function update_status() {
    if ($error.hasClass('active')) {
      return set_status('error');
    }
    if (global_chars === 0) {
      return set_status('welcome');
    }
    return set_status('stats');
  }
  window.us = update_status;

  function check_text() {
    $stats.addClass('processing');
    if (!is_text_ready_to_update()) {
      check_text_later();
      return false;
    }
    text = get_text_for_glvrd();    
    glvrd.proofread(text, function(result) {
      if (result.status === 'error') {
        shit_happens(result.code, result.message)
        return false;
      }
      if (!is_text_ready_to_update()) {
        check_text_later();
        return false;
      }
      $stats_score.text(result.score.replace('.', ','));
      $stats_score_suffix.text(get_word_for_num(result.score, 'баллов', 'балл', 'балла'));
      $stats_stopwords.text(result.fragments.length);
      $stats_stopwords_suffix.text(get_word_for_num(result.fragments.length, 'стоп-слов', 'стоп-слово', 'стоп-слова'));
      var index_increase = 0;
      for (var i = 0; i < result.fragments.length; i++) {
        var 
          start_injection = '<em data-title="' + result.fragments[i].hint.name + '" data-description="' + result.fragments[i].hint.description + '">'
          end_injection = '</em>';
        text = insert_into_string(text, index_increase + result.fragments[i].start, start_injection);
        index_increase += start_injection.length;
        text = insert_into_string(text, index_increase + result.fragments[i].end, end_injection);
        index_increase += end_injection.length;
      }
      $stats.removeClass('processing');
      set_text(text);
    });
    return true;
  }

  function get_glvrd_js_content(callback) {
    chrome.runtime.sendMessage({message: 'Give me last glvrd.js file'}, function(response) {
      callback(response.file_content);
    });
  }

  function get_tab_selection(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {'message': 'Give me selection'}, function(response) {
        if (response && response.text && response.text.length) {
          callback(response.text.replace(/(?:\r\n|\r|\n)/g, '<br>'));
        } else {
          callback(false);
        }
      });
    });
  }

  global_editor = new wysihtml5.Editor('textarea', {
    stylesheets: ['styles/editor.css'],
    parserRules: {
      tags: {
        em: {
          check_attributes: {
            'data-rule': 'alt'
          }
        },
        br: {},
        p: {},
        style: {
          remove: 1
        },
        a: {
          rename_tag: 'span'
        }
      }
    }
  });

  global_editor.on('load', function() {
    $editor_iframe = $(this.composer.iframe);
    $editor_body = $(this.composer.element);
    $editor_head = $editor_iframe.contents().find('head');
    $editor_body.focus();
    resize_textarea();

    get_tab_selection(function(selection) {
      if (selection) {
        set_last_text(selection);
      }
      get_glvrd_js_content(function(glvrd_js_content) {
        if (glvrd_js_content) {
          eval.call(window, glvrd_js_content);
        } else {
          shit_happens('no_glvrd_js');
        }        
        get_last_text(function(text) {
          global_editor.setValue(text);
          update_text_stats();
          resize_textarea();
          check_text();
          update_status();
        });
      });        
    });

    $editor_body
      .on('keyup', function(event) {
        if (event.keyCode < 37 || event.keyCode > 40) {
          set_last_text();
          user_activity();
          check_text();
          resize_textarea();
          update_text_stats();
          update_status();
        };        
      })
      .on('keyup keydown paste change focus click keypress', function() {
        user_activity();
      })
      .on('mouseenter', 'em', function() {
        var
          $em = $(this),
          title = $em.data('title'),
          description = $em.data('description');
        $em.addClass('active');        
        $editor_body.find('em[data-title="' + title + '"]').not($em).addClass('also');
        $rule_title.html(title);
        $rule_description.html(description);
        set_status('rule');
      })
      .on('mouseleave', 'em', function() {
        var $em = $(this);
        $em.removeClass('active');
        $editor_body.find('em').removeClass('also');
        update_status();
      });
    $send_to_glvrd.on('click', function(event) {
      set_last_text();
    })
  });
});