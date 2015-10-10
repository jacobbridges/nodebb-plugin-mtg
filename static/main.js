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

	$(window).on('action:ajaxify.end', function() {
		lightboxy.init();
	  $('.plugin-mtg-a').click(function() {
	    lightboxy.show($(this).attr('data-cardurl'))
	      .click(function() {
	        lightboxy.hide();
	      });
	  });
	})

}());