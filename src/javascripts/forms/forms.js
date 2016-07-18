/**
 * Created by royif on 09/07/16.
 */
var main = function() {
    $('.icon-close').click(function() {
        $('.form').animate({
            left: "-25%"
        }, 200);
    });
};

$(document).ready(main);