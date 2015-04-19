OpenLayers.Handler.Arch = OpenLayers.Class(OpenLayers.Handler.Point, {
    line: null,
    freehand: false,
    freehandToggle: 'shiftKey',
    lineGeometry: null,
    CLASS_NAME: "OpenLayers.Handler.Arc",
    initialize: function(control, callbacks, options) {
        OpenLayers.Handler.Point.prototype.initialize.apply(this, arguments);
    },

    createFeature: function(pixel) {
        var lonlat = this.control.map
            .getLonLatFromPixel(pixel);
        this.point = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat)
        );
        this.line = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString([this.point.geometry])
        );
        this.callback("create", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
        this.layer.addFeatures([this.line, this.point], {
            silent: true
        });
    },

    destroyFeature: function() {
        OpenLayers.Handler.Point.prototype.destroyFeature.apply(this);
        this.line = null;
    },


    removePoint: function() {
        if (this.point) {
            this.layer.removeFeatures([this.point]);
        }
    },


    addPoint: function(pixel) {
        this.removePoint();
        var lonlat = this.control.map.getLonLatFromPixel(pixel);
        this.point = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat)
        );
        if (!this.line) {
            this.createFeature(pixel);

        } else {
            this.line.geometry.addComponent(
                this.point.geometry, this.line.geometry.components.length
            );
        }

        if (this.line.geometry.components.length === 3) {
            this.line.geometry.removeComponent(this.line.geometry.components[this.line.geometry.components.length - 1]);
            this.callback("done", [this.line.geometry, this.getSketch()]);
            this.deactivate();
            this.finalize();
            return;
        }


        this.callback("point", [this.point.geometry, this.getGeometry()]);
        this.callback("modify", [this.point.geometry, this.getSketch()]);
        this.drawFeature();

    },

    finalize: function() {
        this.drawing = false;
        this.mouseDown = false;
        this.lastDown = null;
        this.lastUp = null;
        this.line = null;
        this.point = null;
    },



    modifyFeature: function(pixel) {
        var lonlat = this.control.map.getLonLatFromPixel(pixel);
        if (!this.point) {
            return;
        }
        this.point.geometry.x = lonlat.lon;
        this.point.geometry.y = lonlat.lat;
        this.callback("modify", [this.point.geometry, this.getSketch()]);
        this.point.geometry.clearBounds();
        this.drawFeature();
    },


    drawFeature: function() {
        this.layer.drawFeature(this.line, this.style);
        this.layer.drawFeature(this.point, this.style);
    },


    getSketch: function() {
        return this.line;
    },


    getGeometry: function() {
        var geometry = this.line && this.line.geometry;
        if (geometry && this.multi) {
            geometry = new OpenLayers.Geometry.MultiLineString([geometry]);
        }
        return geometry;
    },


    mousedown: function(evt) {
        if (this.lastDown && this.lastDown.equals(evt.xy)) {
            return false;
        }
        if (this.lastDown == null) {
            if (this.persist) {
                this.destroyFeature();
            }
            this.createFeature(evt.xy);
        } else if ((this.lastUp == null) || !this.lastUp.equals(evt.xy)) {
            this.addPoint(evt.xy);
        }
        this.mouseDown = true;
        this.lastDown = evt.xy;
        this.drawing = true;
        return false;
    },


    mousemove: function(evt) {
        if (this.drawing) {
            if (this.mouseDown && this.freehandMode(evt)) {
                this.addPoint(evt.xy);
            } else {
                this.modifyFeature(evt.xy);
            }
        }
        return true;
    },

    freehandMode: function(evt) {
        return (this.freehandToggle && evt[this.freehandToggle]) ?
            !this.freehand : this.freehand;
    },


    mouseup: function(evt) {
        this.mouseDown = false;
        if (this.drawing) {
            if (this.freehandMode(evt)) {
                this.removePoint();
                this.finalize();
            } else {
                if (this.lastUp == null) {
                    this.addPoint(evt.xy);
                }
                this.lastUp = evt.xy;
            }
            return false;
        }
        return true;
    },


    dblclick: function(evt) {
        var index = this.line.geometry.components.length - 1;
        this.line.geometry.removeComponent(this.line.geometry.components[index]);
        this.removePoint();
        this.finalize();
        return false;
    }
});
