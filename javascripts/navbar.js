(function ($) {
    var defaultOptions = {
        container: null,
        tarLinkDwn: "tarball/master",
        zipLinkDwn:  "zipball/master"
    };

    ns.navbar = function navbar(options) {
        this.options = {};
        this.$container = null;
        this.dom = {
          $tarlink   : null,
          $ziplink   : null,
          $menulink  : null,
        };
        this.init = function initialize(options) {
            this.options = $.extend(true, {}, defaultOptions, options);
            this.$container = this.options.container;
            this.$container.addClass("nav-bar");

            this.dom.$menulink =
                $("<a>",{ "class" : "menu-link",
                          "href"  : "#"})
                    .append(
                      $("<i>", {
                          "class": "fa fa-3x fa-fw fa-bars"
                        })
                    );

            if(this.options.tarLinkDwn){
                this.dom.$tarlink =
                    $("<a>",{ "class" : "tar-link pull-right",
                              "target":"_blank",
                              "href"  : this.options.tarLinkDwn})
                        .append(
                          $("<i>", {
                              "class": "fa fa-3x fa-fw fa-file-archive-o",
                              "title": "TAR archive download",
                              "data-toggle":"tooltip"
                            })
                        );
            }

            if(this.options.zipLinkDwn){
                this.dom.$ziplink =
                    $("<a>",{ "class" : "zip-link pull-right",
                              "target":"_blank",
                               "href" : this.options.zipLinkDwn})
                        .append(
                          $("<i>", {
                              "class": "fa fa-3x  fa-fw fa-file-archive-o",
                              "title": "ZIP archive download",
                              "data-toggle":"tooltip"
                            })
                        );
            }

            $.map(this.dom, $.proxy(function ($e){
                this.$container.append($e);
            }, this));

            this.$container
                .find('[data-toggle="tooltip"]')
                .tooltip({placement:"bottom"});

        };
        return this.init(options);
    };
    ns.navbar.prototype = {};
}($));
