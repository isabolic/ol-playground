var setup = function() {

    var map = new OpenLayers.Map("map");

    var ol_wms = new OpenLayers.Layer.WMS(
        "OpenLayers WMS",
        "http://vmap0.tiles.osgeo.org/wms/vmap0", {
            layers: "basic"
        }
    );

    map.addLayer(ol_wms);

    var vector = new OpenLayers.Layer.Vector("layer", {
        LayerName: 'layer',
        displayInLayerSwitcher: false,
        visibility: true
    });

    map.addLayer(vector);
    map.addControl(new OpenLayers.Control.LayerSwitcher());
    map.zoomToMaxExtent();

    window.controls = getControls(vector);

    for (var key in window.controls) {
        map.addControl(window.controls[key]);
        addControlElement(window.controls[key],key);

        if(key === "drawLinePerpendicular"){
            window.controls[key].handler.setPerpendicular(true);
        }else if (key === "drawLineOrtho"){
            window.controls[key].handler.setOrtho(true);
        }
    }
};

var getControls = function(vectorLayer) {
    return {
        drawArch                :   new OpenLayers.Control.DrawArch(vectorLayer, OpenLayers.Handler.Arch, {
                                        drawCenter : true,
                                        typeCircle : 'line',
                                        geomType   : 'Line,Path,Collection',
                                        active     : true
                                }),
        archEditControl         :   new OpenLayers.Control.EditArch(vectorLayer, {
                                        geomType: 'Line,Path,Collection'
                                }),
        scaleFeature            :   new OpenLayers.Control.ScaleFeature(vectorLayer),
        drawPolygon             :   new OpenLayers.Control.DrawFeature(vectorLayer,
                                        OpenLayers.Handler.Polygon),
        intersection            :   new OpenLayers.Control.Intersect({vector:vectorLayer}),
        rotateFeature           :   new OpenLayers.Control.RotateFeature(vectorLayer),
        drawLinePerpendicular   :   new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path),
        drawLineOrtho           :   new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Path),
    };
};


var addControlElement = function(control, label) {
    var li = document.createElement("li"),
        checkbox = document.createElement("input"),
        _control = control;

    checkbox.setAttribute("type", "radio");
    checkbox.setAttribute("name", "control");

    if (_control.active) {
        checkbox.setAttribute("checked", "true");
        _control.activate();
    }

    li.addEventListener('click', function() {
        for (var key in window.controls) {
            window.controls[key].deactivate();
        }

        _control.activate();
    });


    li.appendChild(checkbox);
    li.appendChild(document.createTextNode(label || control.CLASS_NAME));
    document.getElementsByClassName("controls-container")[0]
        .appendChild(li);

};
