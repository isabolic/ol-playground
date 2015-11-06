(function($) {
    var

    defaultOptions = {
        container: null
    },

    addCustomControlMenu = function (){
        this.dom.$controlContainer
            .append(
                $("<div>", {
                    "class": "toggle-control-menu"
                })
                .append($("<i>", {
                    "class": "fa fa-2x fa-fw toggle-menu fa-chevron-right"
                }))
            );

        this.dom.$controlContainer
            .append(
                $("<div>", {
                    "class": "controls-list-wrapper"
                }).append(
                    $("<ul>", {"class":"controls-list fa-ul"})
                )
            );

        this.dom.$controlContainer.on("click", ".toggle-menu", $.proxy(function(e){
            var $menu =
                    this.dom.$controlContainer
                            .find(".toggle-control-menu"),
                $mapContrl =
                    this.dom.$controlContainer,
                $ctlListWrapper =
                    this.dom.$controlContainer
                            .find(".controls-list-wrapper"),
                CtlrWidth = $menu.outerWidth(true) + 1;

            if($ctlListWrapper.hasClass("hidden")){
                CtlrWidth = 300;
            }
            // debugger;
            $mapContrl.animate({
                width: CtlrWidth
            },{complete: function () {
                    $ctlListWrapper.toggleClass("hidden");
                }
            });
        },this));


        $.map(this.customControls, $.proxy(function(control, name){
            var li = $("<li>").append(
                $("<div>",{"class": "radio radio-info", "control-name": name})
                    .append([
                        $("<input>",{"type":"radio", "name": "control"}),
                        $("<label>",{"for": name, "text":name})
                    ])
            );
            this.dom.$controlContainer
                .find(".controls-list")
                .append(li);

        }, this));

        this.dom.$controlContainer.on("click", ".radio.radio-info", $.proxy(function(e){
            var radio = $(e.currentTarget);

            $.map(this.customControls, $.proxy(function(control, name){
                this.ol.map.addControl(control);
                if(name === radio.attr("control-name")){
                    control.activate();
                }else{
                    control.deactivate();
                }

                if(name === "drawLinePerpendicular"){
                    control.handler.setPerpendicular(true);
                }else if (name === "drawLineOrtho"){
                    control.handler.setOrtho(true);
                }
            }, this));
        }, this));
    },

    addCustomControl = function(vectorLayer) {
        this.customControls = {
            drawArch   : new OpenLayers.Control.DrawArch(vectorLayer, OpenLayers.Handler.Arch, {
                    drawCenter : true,
                    typeCircle : 'line',
                    geomType   : 'Line,Path,Collection',
                    active     : true
            }),
            archEditControl       : new OpenLayers.Control.EditArch(vectorLayer, { geomType : 'Line,Path,Collection'}),
            scaleFeature          : new OpenLayers.Control.ScaleFeature(vectorLayer),
            drawPolygon           : new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Polygon),
            intersection          : new OpenLayers.Control.Intersect({ vector: vectorLayer}),
            rotateFeature         : new OpenLayers.Control.RotateFeature(vectorLayer),
            drawLinePerpendicular : new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path),
            drawLineOrtho         : new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path)
        };

        $.map(this.customControls, $.proxy(function(control){
            this.ol.map.addControl(control);
            control.deactivate();
        }, this));
    };


    ns.mapView = function menu(options) {
        this.$container = null;
        this.dom = {
            $mapContainer: null,
            $controlContainer: null
        };
        this.customControls  = null;
        this.ol = {
            map: null,
            layers: [],
            initExtent: {
                bottom: -62.5341796875,
                left: -44.524841308594,
                right: 65.514221191406,
                top: -10.7666015625
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

            this.dom.$controlContainer = $("<div>", {
                "class": "map-control"
            });

            $.map(this.dom, $.proxy(function($e) {
                this.$container.append($e);
            }, this));
            $(document)
                .ready($.proxy(function() {
                    this.ol.map = new OpenLayers.Map("ex-map", {
                        controls: []
                    });

                    this.ol.layers.push(
                        new OpenLayers.Layer.XYZ("My Map Layer", [
                            "http://a.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w",
                            "http://b.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w",
                            "http://c.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w",
                            "http://d.tiles.mapbox.com/v4/isabolic.k7bc0ljd/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoiaXNhYm9saWMiLCJhIjoiZHFabzRmdyJ9.xih7hNxtMP9ESu5FTq5y3w"
                        ], {
                            sphericalMercator: false,
                            wrapDateLine: true
                        })
                    );

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
                    addCustomControl.apply(this, [this.ol.layers[1]]);
                    addCustomControlMenu.apply(this);

                }, this));
        };

        return this.init(options);
    };

    ns.mapView.prototype = {};

}($));
