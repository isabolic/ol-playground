(function ($) {
    var defaultOptions = {
        container: null,
        active:"map"
    };

    var toggleActive = function toggleActive(e){
        var el = $(e.currentTarget);
        this.$container
            .find(".menu-el.active")
            .removeClass("active");

        el.addClass("active");
    };

    var triggerActiveEvent = function triggerActiveEvent(e){
        var el = $(e.currentTarget);
        $(this).trigger("active.menu");
    };

    ns.menu = function menu(options) {
        this.options = {};
        this.$container = null;
        this.dom = {
            $exampleLink:null,
            $docsLink: null
        };
        this.init = function initialize(options) {
            this.options = $.extend(true, {}, defaultOptions, options);
            this.$container = this.options.container;
            this.$container.addClass("menu-container");

            this.dom.$exampleLink =
              $("<a>",{ "class" : "menu-el example",
                      "href"  : "#"})
                    .append(
                      $("<i>", {
                        "class": "fa fa-4x fa-fw fa-map",
                        "title": "map example",
                        "data-toggle":"tooltip"
                      })
                  );

            this.dom.$docsLink =
              $("<a>",{ "class" : "menu-el docs",
                        "href"  : "#"})
                  .append(
                      $("<i>", {
                        "class": "fa fa-4x fa-fw fa-tasks",
                        "title": "docs :)",
                        "data-toggle":"tooltip"
                      })
                  );

            if(this.options.active === "map"){
                  this.dom.$exampleLink.addClass("active");
            }else if(this.options.active === "docs"){
                  this.dom.$docsLink.addClass("active");
            }

            this.$container.on("click",".menu-el", $.proxy(toggleActive, this));
            this.$container.on("click",".menu-el", $.proxy(triggerActiveEvent, this));

            $.map(this.dom, $.proxy(function ($e){
                this.$container.append($e);
            }, this));

            this.$container
                .find('[data-toggle="tooltip"]')
                .tooltip({placement:"top"});

        };
        return this.init(options);
    };
    ns.navbar.prototype = {};
}($));
