'use strict';

/* globals define, socket, app, config, ajaxify, utils, templates, bootbox */

define('redactor', [
    'composer',
    'translator',
    'composer/autocomplete'
], function (composer, translator, autocomplete) {

    $(window).on('action:composer.loaded', function (ev, data) {
        var postContainer = $('#cmp-uuid-' + data.post_uuid),
            textarea = postContainer.find('textarea');

        $(window).trigger('action:redactor.load', $.Redactor);
        $(window).off('action:redactor.load');

        textarea.redactor({
          uploadImageFields: {
            'cid': '#cmp-cid-' + data.post_uuid,
          },
          uploadFileFields: {
            'cid': '#cmp-cid-' + data.post_uuid,
          }
        });

        var cidEl = postContainer.find('.category-list');
        if (cidEl.length) {
          cidEl.attr('id', 'cmp-cid-' + data.post_uuid);
        } else {
          postContainer.append('<input id="cmp-cid-' + data.post_uuid + '" type="hidden" value="' + ajaxify.data.cid + '"/>');
        }

        if (config.allowTopicsThumbnail && data.composerData.isMain) {
          var thumbToggleBtnEl = postContainer.find('.re-topic_thumb');
          var url = data.composerData.topic_thumb || '';

          postContainer.find('input#topic-thumb-url').val(url);
          postContainer.find('img.topic-thumb-preview').attr('src', url);

          if (url) {
            postContainer.find('.topic-thumb-clear-btn').removeClass('hide');
          }
          thumbToggleBtnEl.addClass('show');
          thumbToggleBtnEl.off('click').on('click', function() {
            var container = postContainer.find('.topic-thumb-container');
            container.toggleClass('hide', !container.hasClass('hide'));
          });
        }
        postContainer.find('.redactor-editor').addClass('write');
        autocomplete.init(postContainer);
    });

    $(window).on('action:composer.resize', function (ev, data) {
        var activeComposer = $('#cmp-uuid-' + composer.active),
            editor = activeComposer.find('.redactor-editor');

        // .redactor-editor class has 20px padding, so compensating...
        editor.css('min-height', data.containerHeight - 40);
        editor.css('max-height', data.containerHeight - 40);
    });

    // Button sugar
    $.Redactor.addButton = function (name, awesome, onClick) {
        if (typeof awesome === 'object') {
            $.Redactor.prototype[name] = function () {
                return awesome;
            };
        } else {
            $.Redactor.prototype[name] = function () {
                return {
                    init: function () {
                        var button = this.button.add(name.toLowerCase().replace(/ /g, '-'), name);
                        if (awesome) this.button.setAwesome(name.toLowerCase().replace(/ /g, '-'), awesome);
                        this.button.addCallback(button, this[name].onClick);
                    },
                    onClick: function () {
                        onClick(this);
                    }
                };
            };
        }
        $.Redactor.opts.plugins.push(name);
    };

    // Topic Thumb
    $.Redactor.prototype.topic_thumb = function () {
        return {
            init: function () {
              var that = this;
              translator.translate('[[topic:composer.thumb_title]]', function (translated) {
                that.button.add('topic_thumb', translated);
                that.button.setAwesome('topic_thumb', 'fa-th-large topic-thumb-btn topic-thumb-toggle-btn');
              });
            }
        };
    };

    // Redactor Options
    $.Redactor.opts.plugins = ['video','table','emoticons','topic_thumb'];
    $.Redactor.opts.focus = true;
    $.Redactor.opts.imageUploadHeaders = {'x-csrf-token': config.csrf_token};
    $.Redactor.opts.imageUpload = '/api/post/upload';
    $.Redactor.opts.imageUploadParam = 'files[]';
    $.Redactor.opts.imageUploadKey = 'url';

    if (config.allowFileUploads) {
        $.Redactor.opts.fileUpload = '/api/post/upload';
        $.Redactor.opts.fileUploadParam = 'files[]';
    }

    var redactor = {};
    redactor.addQuote = function (tid, topicSlug, postIndex, pid, title, username, text) {

        var uuid = composer.findByTid(tid) || composer.active;

        if (text) {
            text = "<blockquote>" + text + "</blockquote>";
        }

        if (uuid === undefined) {
            composer.newReply(tid, pid, title, '[[modules:composer.user_said, ' + username + ']]\n' + text);
            return;
        } else if (uuid !== composer.active) {
            // If the composer is not currently active, activate it
            composer.load(uuid);
        }

        var postContainer = $('#cmp-uuid-' + uuid);
        var bodyEl = postContainer.find('textarea');
        var prevText = bodyEl.val();
        if (parseInt(tid, 10) !== parseInt(composer.posts[uuid].tid, 10)) {
            var link = '[' + title + '](/topic/' + topicSlug + '/' + (parseInt(postIndex, 10) + 1) + ')';
            translator.translate('[[modules:composer.user_said_in, ' + username + ', ' + link + ']]\n', config.defaultLang, onTranslated);
        } else {
            translator.translate('[[modules:composer.user_said, ' + username + ']]\n', config.defaultLang, onTranslated);
        }

        function onTranslated(translated) {
            composer.posts[uuid].body = (prevText.length ? prevText + '\n\n' : '') + translated + text;
            bodyEl.val(composer.posts[uuid].body);
            focusElements(bodyEl);
        }
    };
    return redactor;
});
