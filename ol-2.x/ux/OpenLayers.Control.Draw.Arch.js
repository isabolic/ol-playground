OpenLayers.Control.Draw.Arch = OpenLayers.Class(OpenLayers.Control, {

    CLASS_NAME: "OpenLayers.Control.Draw.Arch",
    EVENT_TYPES: ["activate", "deactivate", "featureadded"],
    handler: null,
    centerPoint: null,
    sides: 50,
    angleBegin: null,
    angleMove: null,
    angleEnd: null,
    radius: 0,
    vertices: [],
    virtualVertices: [],
    dragControl: null,
    centerfeat: null,
    circleGeom: null,
    drawCenter: false,
    typeCircle: 'polygon',
    renderIntent: 'temporary',
    ux: true,
    layer: null,
    x_const: 0,
    y_const: 0,
    style: {
        strokeColor: "#21F42C",
        strokeDashstyle: "dash",
        fillColor: "#FFFFFF",
        fillOpacity: 0,
        pointRadius: 6
    },

    initialize: function(layer, handler, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        if (this.style) {
            OpenLayers.Util.extend(
                OpenLayers.Feature.Vector.style["temporary"],
                this.style
            );
        }
        this.angle = Math.PI * ((1 / this.sides) - (1 / 2));
        this.callbacks = OpenLayers.Util.extend({
                done: this.drawFeature,
                modify: function(vertex, feature) {
                    this.layer.events.triggerEvent(
                        "sketchmodified", {
                            vertex: vertex,
                            feature: feature
                        }
                    );
                },
                create: function(vertex, feature) {
                    this.layer.events.triggerEvent(
                        "sketchstarted", {
                            vertex: vertex,
                            feature: feature
                        }
                    );
                }
            },
            this.callbacks
        );
        var _this = this;
        var dragOptions = {
            geometryTypes: ["OpenLayers.Geometry.Point"],
            onStart: function(feature, pixel) {
                _this.dragStart.apply(_this, [feature, pixel]);
            },
            onDrag: function(feature, pixel) {
                _this.dragVertex.apply(_this, [feature, pixel]);
            },
            onComplete: function(feature) {
                _this.dragComplete.apply(_this, [feature]);
            }
        };
        this.dragControl = new OpenLayers.Control.DragFeature(
            layer, dragOptions
        );

        this.layer = layer;
        this.handlerOptions = this.handlerOptions || {};
        if (!("multi" in this.handlerOptions)) {
            this.handlerOptions.multi = false;
        }
        var sketchStyle = this.layer.styleMap && this.layer.styleMap.styles.temporary;
        if (sketchStyle) {
            this.handlerOptions.layerOptions = OpenLayers.Util.applyDefaults(
                this.handlerOptions.layerOptions, {
                    styleMap: new OpenLayers.StyleMap({
                        "default": sketchStyle
                    })
                }
            );
        }
        this.handler = new handler(this, this.callbacks, this.handlerOptions);

    },
    dragStart: function(feature, pixel) {
        if (feature.geometry.equals(this.centerPoint)) {
            this.dragControl.deactivate();
            this.dragControl.activate();
            return;
        }

        (this.centerfeat) ? this.layer.destroyFeatures([this.centerfeat], {
            silent: true
        });
    },

    dragVertex: function(vertex, pixel) {
        this.modified = true;

        if (this.feature.geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
            // dragging a simple point
            /*if(this.feature != vertex) {
                this.feature = vertex;
            }*/
            this.layer.events.triggerEvent("vertexmodified", {
                vertex: vertex.geometry,
                feature: this.feature,
                pixel: pixel
            });
        } else {
            if (vertex._index) {

                vertex.geometry.parent.addComponent(vertex.geometry,
                    vertex._index);
                delete vertex._index;
                OpenLayers.Util.removeItem(this.virtualVertices, vertex);
                this.vertices.push(vertex);
            } else if (vertex == this.dragHandle) {
                this.layer.removeFeatures(this.vertices, {
                    silent: true
                });
                this.vertices = [];
                if (this.radiusHandle) {
                    this.layer.destroyFeatures([this.radiusHandle], {
                        silent: true
                    });
                    this.radiusHandle = null;
                }
            } else if (vertex !== this.radiusHandle) {
                this.layer.events.triggerEvent("vertexmodified", {
                    vertex: vertex.geometry,
                    feature: this.feature,
                    pixel: pixel
                });
            }

            if (this.virtualVertices.length > 0) {
                this.layer.destroyFeatures(this.virtualVertices, {
                    silent: true
                });
                this.virtualVertices = [];
            }

            this.layer.drawFeature(this.feature, this.renderIntent);
        }
        this.layer.drawFeature(vertex);
        this.doArc(vertex, 'tmp');
    },

    doArc: function(vertex, tmp) {
        var point1, point2, point3;
        var mr, mt;

        var xc, yc, x1, x2, x3, y1, y2, y3;

        point1 = this.firstPoint;
        point2 = vertex.geometry;
        point3 = this.secondPoint;


        x1 = point1.y;
        x2 = point2.y;
        x3 = point3.y;
        y1 = point1.x;
        y2 = point2.x;
        y3 = point3.x;

        this.x_const = (x1 + x2) / 2;
        this.y_const = (y1 + y2) / 2;


        x1 = x1 - this.x_const;
        x2 = x2 - this.x_const;
        x3 = x3 - this.x_const;
        y1 = y1 - this.y_const;
        y2 = y2 - this.y_const;
        y3 = y3 - this.y_const;

        xc = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / (2 * (x1 * y2 - x2 * y1 - x1 * y3 + x3 * y1 + x2 * y3 - x3 * y2));
        yc = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / (2 * (x1 * y2 - x2 * y1 - x1 * y3 + x3 * y1 + x2 * y3 - x3 * y2));

        this.radius = Math.sqrt(Math.pow((y2 - yc), 2) + Math.pow((x2 - xc), 2));


        this.centerPoint = new OpenLayers.Geometry.Point(yc, xc);
        this.centerPointDraw = new OpenLayers.Geometry.Point(yc + this.y_const, xc + this.x_const);

        (this.centerfeat && this.drawCenter) ? this.layer.destroyFeatures([this.centerfeat], {
            silent: true
        }): null;

        this.centerfeat = new OpenLayers.Feature.Vector(this.centerPointDraw, {});

        this.angleBegin = (Math.atan2((x3 - xc), (y3 - yc)) * (180 / Math.PI));
        this.angleMove = (Math.atan2((x2 - xc), (y2 - yc)) * (180 / Math.PI));
        this.angleEnd = (Math.atan2((x1 - xc), (y1 - yc)) * (180 / Math.PI));

        this.angleBegin = (this.angleBegin < 0) ? this.angleBegin + 360 : this.angleBegin;
        this.angleMove = (this.angleMove < 0) ? this.angleMove + 360 : this.angleMove;
        this.angleEnd = (this.angleEnd < 0) ? this.angleEnd + 360 : this.angleEnd;

        (this.angleBegin > this.angleEnd) ? this.doSwap(): null;

        if (this.angleMove > this.angleBegin && this.angleMove < this.angleEnd) {} else {
            this.doSwap();
            this.angleBegin = this.angleBegin - 360;
        }

        if (this.drawCenter) {
            this.layer.addFeatures([this.centerfeat], {
                silent: true
            });
            this.layer.drawFeature(this.centerfeat, this.renderIntent);
        }

        this.modifyGeometry(tmp);
    },

    doSwap: function() {
        var vB, vE;
        vB = this.angleBegin;
        vE = this.angleEnd;
        this.angleBegin = vE;
        this.angleEnd = vB;
    },

    modifyGeometry: function(tmp) {
        var angle, point = {},
            x, y, ring;
        var omega = this.angleEnd;
        var alpha = this.angleBegin;
        if (this.typeCircle !== 'line') {
            ring = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LinearRing([])
            );
        } else {
            ring = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString([])
            );
        }
        if (this.circleGeom) {
            this.layer.destroyFeatures([this.circleGeom], {
                silent: true
            });

        }

        for (var i = 0; i <= this.sides; ++i) {
            var Angle = alpha - (alpha - omega) * i / (this.sides);
            x = this.centerPoint.x + (this.radius * Math.cos(Angle * Math.PI / 180));
            y = this.centerPoint.y + (this.radius * Math.sin(Angle * Math.PI / 180));
            ring.geometry.addComponent(
                new OpenLayers.Geometry.Point(x + this.y_const, y + this.x_const), ring.geometry.components.length
            );
        }
        if (this.typeCircle !== 'line') {
            this.circleGeom = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Polygon([ring.geometry])
            );
        } else {
            this.circleGeom = ring;
        }

        if (tmp) {
            this.layer.addFeatures([this.circleGeom], {
                silent: true
            });
            this.layer.drawFeature(this.circleGeom, this.renderIntent);
        } else {
            this.layer.addFeatures([this.circleGeom]);
            this.events.triggerEvent("featureadded", {
                feature: this.circleGeom
            });
        }
    },


    dragComplete: function(vertex) {
        this.doArc(vertex);
        this.reset(vertex);
        (this.centerfeat && this.drawCenter) ? this.layer.destroyFeatures([this.centerfeat], {
            silent: true
        }): null;
    },

    drawFeature: function(geometry) {
        var feature = new OpenLayers.Feature.Vector(geometry);
        var proceed = this.layer.events.triggerEvent(
            "sketchcomplete", {
                feature: feature
            }
        );
        if (proceed !== false) {
            feature.state = OpenLayers.State.INSERT;
            this.layer.addFeatures([feature], {
                silent: true
            });
            //this.featureAdded(feature);
            if (!this.dragControl.map) {
                this.map.addControl(this.dragControl);
            }
            this.dragControl.activate();
            this.handler.deactivate();
            this.setGeometryIntoModify(geometry);
            this.feature = feature;
            this.layer.drawFeature(this.feature, this.renderIntent);
            this.firstPoint = feature.geometry.components[0];
            this.secondPoint = feature.geometry.components[1];
        }
    },


    reset: function(vertex) {
        (vertex) ? this.layer.destroyFeatures([vertex], {
            silent: true
        }): null;
        (this.feature) ? this.layer.destroyFeatures([this.feature], {
            silent: true
        }): null;
        this.circleGeom = null;
        this.angleBegin = null;
        this.angleMove = null;
        this.angleEnd = null;
        this.radius = null;
        this.firstPoint = null;
        this.secondPoint = null;

        (this.feature) ? this.layer.destroyFeatures(this.virtualVertices, {
            silent: true
        }): null;
        if (this.dragControl.map) {
            this.dragControl.deactivate();
        }
        this.handler.activate();
    },


    setGeometryIntoModify: function(geometry) {

        this.virtualVertices = [];
        var control = this;

        function collectComponentVertices(geometry) {
            var i, vertex, component, len;
            if (geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
                vertex = new OpenLayers.Feature.Vector(geometry);
                vertex._sketch = true;
                control.vertices.push(vertex);
            } else {
                var numVert = geometry.components.length;
                if (geometry.CLASS_NAME == "OpenLayers.Geometry.LinearRing") {
                    numVert -= 1;
                }
                for (i = 0; i < numVert; ++i) {
                    component = geometry.components[i];
                    if (component.CLASS_NAME == "OpenLayers.Geometry.Point") {
                        vertex = new OpenLayers.Feature.Vector(component);
                        vertex._sketch = true;
                        control.vertices.push(vertex);
                    } else {
                        collectComponentVertices(component);
                    }
                }

                // add virtual vertices in the middle of each edge
                if (geometry.CLASS_NAME != "OpenLayers.Geometry.MultiPoint") {
                    for (i = 0, len = geometry.components.length; i < len - 1; ++i) {
                        var prevVertex = geometry.components[i];
                        var nextVertex = geometry.components[i + 1];
                        if (prevVertex.CLASS_NAME == "OpenLayers.Geometry.Point" &&
                            nextVertex.CLASS_NAME == "OpenLayers.Geometry.Point") {
                            var x = (prevVertex.x + nextVertex.x) / 2;
                            var y = (prevVertex.y + nextVertex.y) / 2;
                            var point = new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.Point(x, y),
                                null, control.virtualStyle
                            );
                            // set the virtual parent and intended index
                            point.geometry.parent = geometry;
                            point._index = i + 1;
                            point._sketch = true;
                            control.virtualVertices.push(point);
                        }
                    }
                }
            }
        }
        collectComponentVertices.call(this, geometry);
        this.layer.addFeatures(this.virtualVertices, {
            silent: true
        });
    },


    deactivate: function() {
        this.reset();
        this.selectedFeatures = [];
        this.handler.deactivate();
        this.active = false;
        this.angleBegin = null;
        this.angleMove = null;
        this.angleEnd = null;
        this.events.triggerEvent("deactivate", {
            obj: this
        });
    },

    activate: function() {
        this.handler.activate();
        this.active = true;
        this.events.triggerEvent("activate", {
            obj: this
        });
    }

});
