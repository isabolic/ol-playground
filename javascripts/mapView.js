(function ($) {
    var defaultOptions = {
        container: null
    };

    ns.mapView = function menu(options) {
        this.$container = null;
        this.dom = null;
        this.init = function initialize(options) {
            this.options = $.extend(true, {}, defaultOptions, options);
            this.$container = this.options.container;


            //$.map(this.dom, $.proxy(function ($e){
            //    this.$container.append($e);
            //}, this));
        };

        return this.init(options);
    };
    ns.mapView.prototype = {};
}($));
