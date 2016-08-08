$(function() {

    var toggles = "data-sg-toggle",
        menuLinks = "sg-menu_link",
        $menu = $("#sg-menu"),
        $sections = $('#styleguide .sg-section');

    var $toggles = $('['+toggles+']');
    var $menuLinks = $('.'+menuLinks);

    Sticky menu
    $('#sg-menu_wrap').stick_in_parent();

    //Menu toggles
    $toggles.on('toggle', function(e){
        var $this = $(this);
        var $target = $($this.attr(toggles));
        $this.toggleClass('toggle-active');
        $target.toggleClass('toggle-active');

        if($this.hasClass('sg-menu_toggle')) {
            $target.slideToggle('fast');
        }
    });

    $('body').on('click', $toggles.selector, function(e){
        $(this).trigger('toggle');
    });

});
