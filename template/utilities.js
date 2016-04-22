$(function() {
    //Sticky menu
    $('#styleguide-menu-wrap').stick_in_parent();

    //Menu toggles
    $('[data-toggle]').on('toggle', function(e){
        var $this = $(this);
        var $target = $($this.data('toggle'));
        $this.toggleClass('toggle-active');
        $target.slideToggle('fast').toggleClass('toggle-active');
    });

    $('#styleguide-menu').on('click', '[data-toggle]', function(e){
        $(this).trigger('toggle');
    });

    // Style Guide-specific functions
    // History/Hash change handling
    var History = window.History;
    var $menu = $("#styleguide-menu");
    var $sections = $('#styleguide .sg-section');
    var Title = document.title;

    $sections.hide();

    var updateMenu = function(state) {
        var $menuItem = $menu.find('a[href="#'+state+'"]').not('.toggle');
        $menu.find('a.on').removeClass('on');
        $menuItem.addClass('on');

        if ($menuItem.hasClass('sub-sub')){
            $menuItem.closest('.submenu').siblings('.submenulink').addClass('on')
            .siblings('.submenu_toggle').not('.toggle-active').trigger('toggle');
        }
    };

    var updateContent = function(state, hash){
        var sectionID = "#"+state;
        try {
            var $section = $('#styleguide').find(sectionID);
            var dataSection = "[data-section='"+$section.data('section')+"']";

                $sections.hide();
                //show all articles of the same sections
                $(dataSection).show();

                //Handle section containers
                $section.children($sections).show()
                    $('html, body').animate({
                        scrollTop: $section.offset().top
                    }, 200);

        }catch(err){
            //Just show all sections if section doesn't exist
            $sections.show();
        }
    };

    var getState = function(e){
        var state = History.getState();
        if (window.location.pathname == state.hash) {
            $sections.show();
        }else{
            var replacement = window.location.pathname + '?section=';
            var saneState = state["hash"].replace(replacement,"");
            saneState = saneState.replace("&_suid="+state.id, "");
            updateMenu(saneState);
            updateContent(saneState);
        }
    }

    //On hashchange
    $(window).on('hashchange', function(e){
        var winHash = window.location.hash;
        var winState = winHash.replace("#", "");
        var stated = "?section=" + winState;
        History.pushState(null, Title, stated);
        return false;
    });

    //Bind history change
    History.Adapter.bind(window, 'statechange', function(e){
        getState();
    });

    //Get state of document on load
    getState();

    //Wrap code references in links
    $('.global').each(function(i){
      if (!($(this).parent().hasClass('sg-heading'))){
    	  var id = $(this).data('code-id');
    		  id = "_"+id+"_";
    	  var aWrapper = '<a class="sg-code-reference" href="#heading-'+id+'"></a>';
    	  $(this).wrap(aWrapper);
      }
    });
});
