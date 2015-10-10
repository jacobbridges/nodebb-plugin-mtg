// Generated by CoffeeScript 1.10.0
(function() {
  var Mtg, _, async, cache, getCard, request, template;

  async = module.parent.require('async');

  Mtg = {};

  request = require('request');

  _ = require('lodash');

  cache = module.parent.require('lru-cache')({
    maxAge: 100 * 60 * 60 * 24,
    max: 100
  });

  template = '<span data-cardurl="http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=_IMG_&amp;type=card" class="plugin-mtg-a">_NAME_</a>';

  Mtg.regex = /\[mtg\][A-Za-z0-9\&\#\-;'",.\(\)\[\]\s]+\[\/mtg\]/gm;

  Mtg.clean = function(input, isMarkdown, stripBlockquote, stripCode) {
    var bqMatch, pfMatch;
    if (!input) {
      return input;
    }
    if (stripBlockquote) {
      bqMatch = isMarkdown ? /^>.*$/gm : /^<blockquote>.*<\/blockquote>/gm;
      input = input.replace(bqMatch, '');
    }
    if (stripCode) {
      pfMatch = isMarkdown ? /`[^`\n]+`/gm : /<code>.*<\/code>/gm;
      input = input.replace(pfMatch, '');
    }
    return input;
  };

  Mtg.parsePost = function(data, callback) {
    if (!_.get(data, 'postData.content')) {
      return callback(null, data);
    }
    return Mtg.parseRaw(data.postData.content, function(err, content) {
      if (err) {
        callback(err);
      }
      data.postData.content = content;
      return callback(null, data);
    });
  };

  Mtg.parseRaw = function(content, callback) {
    var cardNames, cleanedContent, matches;
    cleanedContent = Mtg.clean(content, false, false, true);
    matches = cleanedContent.match(Mtg.regex);
    if (!matches) {
      return callback(null, content);
    }
    cardNames = _.uniq(matches);
    return async.map(cardNames, (function(cardName, next) {
      if (cache.has(cardName)) {
        next(null, cache.get(cardName));
      } else {

      }
      return getCard(cardName, function(err, cardObj) {
        if (err) {
          return next(err);
        }
        cache.set(cardName, cardObj);
        return next(err, cardObj);
      });
    }), (function(err, cards) {
      var card, i, j, len;
      if (err) {
        return callback(err, content);
      }
      for (i = j = 0, len = cards.length; j < len; i = ++j) {
        card = cards[i];
        content = content.replace(cardNames[i], template.replace(/_IMG_/g, card.ID).replace(/_NAME_/, card.Name));
      }
      return callback(err, content);
    }));
  };

  getCard = function(mtgCardName, callback) {
    var uriSafeCardName;
    mtgCardName = mtgCardName.replace('[mtg]', '');
    mtgCardName = mtgCardName.replace('[/mtg]', '');
    mtgCardName = mtgCardName.replace('&#39;', "'");
    uriSafeCardName = encodeURIComponent(mtgCardName);
    return request.get({
      url: "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx?nameFragment=" + uriSafeCardName
    }, function(err, response, body) {
      var responseData;
      if (response.statusCode === 200) {
        responseData = JSON.parse(body);
      } else {
        callback(err);
      }
      if (_.get(responseData, 'Results.length')) {
        return callback(null, responseData.Results[0]);
      } else {
        return callback(err);
      }
    });
  };

  module.exports = Mtg;

}).call(this);
