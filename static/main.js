(function() {
	"use strict";

	var shadyHTML = '<div id="shady"></div>'

	var lightboxy = {
	  init: function() {
	    if($('#shady').length) return null;
	    $('body').append(shadyHTML);
	    $('#shady').hide();
	  },
	  show: function(imgURL) {
	    $('#shady').append("<img class=\"lightboxy-pic\" src=\""+imgURL+"\" />");
	    $('#shady').css('z-index', 1031).show();
	    $("[src=\""+imgURL+"\"]").css('z-index', 1032).show();
	    return $('#shady');
	  },
	  hide: function() {
	    $('#shady').hide().empty();
	  }
	}

	$(document).on('click', '.plugin-mtg-a', function() {
		lightboxy.init();
		lightboxy.show($(this).attr('data-cardurl'))
      .click(function() {
        lightboxy.hide();
      });
	});

}());