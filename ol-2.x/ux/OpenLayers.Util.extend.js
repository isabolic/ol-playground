OpenLayers.Util.distanceBetween2Coordinates = function(x1, y1, x2, y2) {
    //return on 5 decimals
    var distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    return Math.round(distance * Math.pow(10, 5)) / Math.pow(10, 5);
};

OpenLayers.Util.wayAngle = function(x1, y1, x2, y2) {
    var angle;
    if (Math.abs(x1 - x2) < 0.000001 && Math.abs(y1 - y2 < 0.000001)) {
        angle = 0;
    } else {
        angle = Math.atan2(y2 - y1, x2 - x1);
        angle = Math.PI / 2 - angle;
        if (angle < 0) {
            angle = angle + 2 * Math.PI;
        }
    }
    return angle;
};

OpenLayers.Util.dismantleCollection = function(feature) {
    var collection = [];
    if (feature.geometry.CLASS_NAME == "OpenLayers.Geometry.Collection") {
        for (var i = 0, len = feature.geometry.components.length; i < len; ++i) {
            var comp = new OpenLayers.Feature.Vector(feature.geometry.components[i]);
            var compCollection = OpenLayers.Util.dismantleCollection(comp);
            for (var j = 0, jlen = compCollection.length; j < jlen; ++j) {
                collection[collection.length] = compCollection[j];
            }
        }
    } else {
        collection[collection.length] = feature;
    }
    return collection;
};

OpenLayers.Util.objectIsArch = function(geometry) {
    var circular = false;
    if (geometry.attributes && (geometry.attributes.type === 'arc')) {
        circular = true;
    }
    return circular;
};

OpenLayers.Util.arc = function(originX, originY, radius, angleBeginRad, angleEndRad) {
    var sides = Math.ceil(Math.sqrt(radius) * 4);
    sides = (sides < 40) ? 40 : sides;
    sides = (sides > 150) ? 150 : sides;
    sides = Math.ceil((angleEndRad - angleBeginRad) * sides / (2 * Math.PI));
    sides = (sides < 4) ? 4 : sides;

    var otklon = (angleEndRad - angleBeginRad) / (sides);
    var ring = [];
    var angle, x, y;
    for (var i = 0; i <= sides; ++i) {
        angle = (angleBeginRad + i * otklon);
        x = originX + (radius * Math.sin(angle));
        y = originY + (radius * Math.cos(angle));

        ring[i] = new OpenLayers.Geometry.Point(x, y);
    }
    var kruzniLuk = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(ring));

    kruzniLuk.geometry.attributes = {
        type: 'arc',
        OriginX: originX,
        OriginY: originY,
        radius: radius,
        StartBearing: angleBeginRad,
        EndBearing: angleEndRad
    };
    return kruzniLuk;
};
