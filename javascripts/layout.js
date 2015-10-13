(function ($) {
    window.ns = {};
    var defaultOptions = {
        layoutTemplate: {
            $container: $("<div>", {
                "class": "container-fluid container-layout"
            }),
            $containerRow: $("<div>", {
                    "class": "row"
                })
                .append($("<div>", {
                    "class": "menu col-md-1 col-sm-2"
                }))
                .append($("<div>", {
                    "class": "container-content col-sm-11"
                })),
            $navBar: $("<div>", {
                    "class": "row navigation-bar"
                })
                .append($("<div>", {
                    "class": "col-sm-12 navigation-bar-cnt"
                })),
        }
    };

    var resizeContainerRow = function resizeContainerRow() {
        var layoutTemplate = this.options.layoutTemplate;
        layoutTemplate.$containerRow
                      .height($("body").height() - layoutTemplate.$navBar.height());
    };

    ns.layout = function layout(options) {
        this.options = {};
        this.navbar = null;
        this.init = function initialize(options) {
            var layoutTemplate;

            this.options = $.extend(true, {}, defaultOptions, options);
            layoutTemplate = this.options.layoutTemplate;

            layoutTemplate
                .$container
                .append(layoutTemplate.$navBar)
                .append(layoutTemplate.$containerRow);

            $("body")
                .append(layoutTemplate.$container);

            this.menu = new ns.menu({
              container: layoutTemplate.$containerRow.find(".menu")
            });

            this.navbar = new ns.navbar({
                container: layoutTemplate.$navBar.find(".navigation-bar-cnt")
            });

            this.mapView = new ns.mapView({
                container: layoutTemplate.$containerRow.find(".container-content")
            });

            $(window).resize($.proxy(resizeContainerRow, this));
            resizeContainerRow.apply(this);
        };

        return this.init(options);
    };
    ns.layout.prototype = {};
}($));
