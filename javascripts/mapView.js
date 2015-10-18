(function ($) {
    var defaultOptions = {
        container: null
    };

    var addCutomControl = function (vectorLayer) {
        var customControls = {
                 drawArch: new OpenLayers.Control.DrawArch(vectorLayer, OpenLayers.Handler.Arch, {
                     drawCenter: true,
                     typeCircle: 'line',
                     geomType: 'Line,Path,Collection',
                     active: true
                 }),
                 archEditControl: new OpenLayers.Control.EditArch(vectorLayer, {
                     geomType: 'Line,Path,Collection'
                 }),
                 scaleFeature: new OpenLayers.Control.ScaleFeature(vectorLayer),
                 drawPolygon: new OpenLayers.Control.DrawFeature(vectorLayer,
                     OpenLayers.Handler.Polygon),
                 intersection: new OpenLayers.Control.Intersect({
                     vector: vectorLayer
                 }),
                 rotateFeature: new OpenLayers.Control.RotateFeature(vectorLayer),
                 drawLinePerpendicular: new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path),
                 drawLineOrtho: new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path)
              };
    };


    ns.mapView = function menu(options) {
        this.$container = null;
        this.dom = {
            $mapContainer: null
        };
        this.ol = {
            map: null,
            layers: [],
            initExtent: {
                bottom: 2783530.8216455,
                left: -5135039.5594831,
                right: 7114452.8436809,
                top: 8546271.2573193
            },
            customControls: [],
        };

        this.init = function initialize(options) {
            this.options = $.extend(true, {}, defaultOptions, options);
            this.$container = this.options.container;

            this.dom.$mapContainer = $("<div>", {
                "class": "map",
                "id": "ex-map"
            });

            $.map(this.dom, $.proxy(function ($e) {
                this.$container.append($e);
            }, this));
            $(document)
                .ready($.proxy(function () {
                    this.ol.map = new OpenLayers.Map("ex-map", {
                        controls: []
                    });

                    //this.ol.layers.push(new OpenLayers.Layer.OSM( "Simple OSM Map")) ;
                    this.ol.layers.push(
                        new OpenLayers.Layer.XYZ("My Map Layer", [
                          "http://a.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w",
                          "http://b.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w",
                          "http://c.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w",
                          "http://d.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w"
                        ], {
                            sphericalMercator: true,
                            wrapDateLine: true
                        }));

                    this.ol.layers.push(new OpenLayers.Layer.Vector("layer", {
                        LayerName: 'layer',
                        displayInLayerSwitcher: false,
                        visibility: true
                    }));

                    this.ol.map.addControl(new OpenLayers.Control.Navigation());
                    this.ol.map.addLayers(this.ol.layers);

                    this.ol.initExtent =
                        new OpenLayers.Bounds(this.ol.initExtent.left,
                            this.ol.initExtent.bottom,
                            this.ol.initExtent.right,
                            this.ol.initExtent.top);

                    this.ol.map.zoomToExtent(this.ol.initExtent);
                }, this));

                //addCutomControl.apply(this [this.ol.layers[0]]);
        };

        return this.init(options);
    };

    ns.mapView.prototype = {};

}($));
