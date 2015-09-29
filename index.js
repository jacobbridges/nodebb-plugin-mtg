/**
* Author: Jacob Bridges
* Date: 2014-10-07
* Time: 12:03 AM EASTERN TIME
*/

var	request = require('request'),
    async = module.parent.require('async'),
    winston = module.parent.require('winston'),
    S = module.parent.require('string'),
    meta = module.parent.require('./meta'),

    mtgRegex = /\[mtg\][A-Za-z0-9\&\#;'",.\(\)\[\]\s]+\[\/mtg\]/gm,
    Embed = {},
    cache, appModule;

Embed.init = function(app, middleware, controllers) {
    appModule = app;
};

Embed.parse = function(raw, callback) {
    var mtgCardNames = [],
        matches, cleanedText;

    cleanedText = S(raw).stripTags().s;
    matches = cleanedText.match(mtgRegex);

    if (matches && matches.length) {
        matches.forEach(function(match) {
            if (mtgCardNames.indexOf(match) === -1) {
                mtgCardNames.push(match);
            }
        });
    }

    async.map(mtgCardNames, function(mtgCardName, next) {
        if (cache.has(mtgCardName)) {
            next(null, cache.get(mtgCardName));
        } else {
            getCard(mtgCardName, function(err, mtgObj) {
                if (err) {
                    return next(err);
                }

                cache.set(mtgCardName, mtgObj);
                next(err, mtgObj);
            });
        }
    }, function(err, cards) {
        //console.log("cards: ", cards);
        if (!err) {
            appModule.render('partials/gatherer-blocks', {
                cards: cards
            }, function(err, html) {
                //console.log(html);
		if (html != undefined) {
                	var html_pieces = html.split('<i></i>');
                	//console.log("Length of html_pieces", html_pieces.length);
                	for (var i=0; i < (html_pieces.length - 1); i++) {
        	            //console.log("Replacing: " + mtgCardNames[i] + " with ", html_pieces[i]);
	                    //raw = raw.replace(/\[mtg\]\[\/mtg\]/g, html_pieces[i]);
			    raw = replaceAll(raw, mtgCardNames[i], html_pieces[i]);
                	}
                	callback(null, raw);
		}
		else {
			callback(null, raw);
		}
            });
        } else {
            winston.warn('Encountered an error while loading the MtG card, quitting ahead.');
            callback(null, raw);
        }
    });
};

var getCard = function(mtgCardName, callback) {
    mtgCardName = mtgCardName.replace('[mtg]', '');
    mtgCardName = mtgCardName.replace('[/mtg]', '');
    mtgCardName = mtgCardName.replace('&#39;', "'");
    //console.log('Getting MtG card', mtgCardName);
    //console.log(encodeURIComponent(mtgCardName));

    request.get({
        url: 'http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx?nameFragment=' + encodeURIComponent(mtgCardName)
    }, function(err, response, body) {
        if (response.statusCode === 200) {
            var response_data = JSON.parse(body);
            if(response_data.Results && response_data.Results.length) {
               // console.log("Response data", response_data);
                callback(null, response_data.Results[0]);
            }
            else
                callback(err);
        } else {
            callback(err);
        }
    });
};

// Utility Functions
var escapeRegExp = function(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
var replaceAll = function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// Initial setup
cache = require('lru-cache')({
    maxAge: 1000*60*60*24,
    max: 100
});

module.exports = Embed;
