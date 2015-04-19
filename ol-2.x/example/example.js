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

    window.archControl = new OpenLayers.Control.DrawArch(vector, OpenLayers.Handler.Arch, {
        drawCenter: true,
        typeCircle: 'line',
        geomType: 'Line,Path,Collection'
    });
    map.addControl(window.archControl);

    window.archControl.activate();
};
