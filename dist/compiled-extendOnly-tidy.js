OpenLayers.Control.DrawArch = OpenLayers.Class(OpenLayers.Control, {

    CLASS_NAME: "OpenLayers.Control.DrawArch",
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

        if (this.centerfeat)
            this.layer.destroyFeatures([this.centerfeat], {
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

OpenLayers.Control.EditArch = OpenLayers.Class(OpenLayers.Control, {

    CLASS_NAME: "OpenLayers.Control.EditArch",
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
    toggleKey: 'shiftKey',
    modified: false,
    ux: true,
    selectedFeatures: [],
    typeCircle: 'polygon',
    renderIntent: 'temporary',
    x_const: 0,
    y_const: 0,
    style: {
        strokeColor: "#21F42C",
        strokeDashstyle: "dash",
        fillColor: "#FFFFFF",
        fillOpacity: 0
    },
    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        if (this.style) {
            OpenLayers.Util.extend(
                OpenLayers.Feature.Vector.style["temporary"],
                this.style
            );
        }
        this.layer = layer;
        this.angle = Math.PI * ((1 / this.sides) - (1 / 2));

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


        var callbacks = {
            click: this.clickFeature,
            clickout: this.clickoutFeature
        };

        this.callbacks = OpenLayers.Util.extend(callbacks, this.callbacks);
        this.handler = new OpenLayers.Handler.Feature(
            this, this.layer, this.callbacks, {
                clickTolerance: 100
            }
        );
    },

    dragStart: function(feature, pixel) {

        if (this.centerfeat)
            this.layer.destroyFeatures([this.centerfeat], {
                silent: true
            });

        if (feature != this.feature && !feature.geometry.parent &&
            feature != this.dragHandle && feature != this.radiusHandle) {
            if (this.standalone === false && this.feature) {
                this.selectControl.clickFeature.apply(this.selectControl, [this.feature]);
            }
            if (this.geometryTypes === null ||
                OpenLayers.Util.indexOf(this.geometryTypes, feature.geometry.CLASS_NAME) != -1) {

                this.selectControl.clickFeature.apply(
                    this.selectControl, [feature]);

                this.dragControl.overFeature.apply(this.dragControl, [feature]);
                this.dragControl.lastPixel = pixel;
                this.dragControl.handlers.drag.started = true;
                this.dragControl.handlers.drag.start = pixel;
                this.dragControl.handlers.drag.last = pixel;
            }
        }
    },

    dragVertex: function(vertex, pixel) {
        this.modified = true;

        if (this.feature.geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
            // dragging a simple point
            if (this.feature != vertex) {
                this.feature = vertex;
            }
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

        this.centerfeat = new OpenLayers.Feature.Vector(this.centerPointDraw, {});

        this.angleBegin = (Math.atan2((x3 - xc), (y3 - yc)) * (180 / Math.PI));
        this.angleMove = (Math.atan2((x2 - xc), (y2 - yc)) * (180 / Math.PI));
        this.angleEnd = (Math.atan2((x1 - xc), (y1 - yc)) * (180 / Math.PI));

        //1 step - all positive
        this.angleBegin = (this.angleBegin < 0) ? this.angleBegin + 360 : this.angleBegin;
        this.angleMove = (this.angleMove < 0) ? this.angleMove + 360 : this.angleMove;
        this.angleEnd = (this.angleEnd < 0) ? this.angleEnd + 360 : this.angleEnd;
        //2 step swap values

        if (this.angleBegin > this.angleEnd)
            this.doSwap();

        //3 step swap values if midlle value is bigger then end or smaller then begin
        if (this.angleMove > this.angleBegin && this.angleMove < this.angleEnd) {} else {
            this.doSwap();
            this.angleBegin = this.angleBegin - 360;
        }

        if (this.drawCenter)
            this.layer.addFeatures([this.centerfeat], {
                silent: true
            });

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
        if (this.selectedFeatures[0].geometry.CLASS_NAME === 'OpenLayers.Geometry.Polygon') {
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
        if (this.selectedFeatures[0].geometry.CLASS_NAME === 'OpenLayers.Geometry.Polygon') {

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
            this.circleGeom = null;
        }
    },


    dragComplete: function(vertex) {
        this.doArc(vertex);
        this.reset(vertex);
        this.layer.destroyFeatures(this.selectedFeatures, {
            silent: true
        });
        this.selectedFeatures = [];

    },


    toggleSelect: function() {
        return (this.handler.evt &&
            this.handler.evt[this.toggleKey]);
    },

    beforeSelectFeature: function(feature) {
        return this.layer.events.triggerEvent(
            "beforefeaturemodified", {
                feature: feature
            }
        );
    },

    clickFeature: function(feature) {
        if (this.beforeSelectFeature === false) {
            return;
        }
        if (feature.geometry.CLASS_NAME.indexOf('Collection') > -1) {
            var cmpGeom;
            var ll = this.map.getLonLatFromViewPortPx(this.handler.evt.xy);
            var GeomPoly = new OpenLayers.Geometry.Point(ll.lon, ll.lat);
            var bounds = GeomPoly.getBounds();

            var width = 0.2;
            var height = 0.2;
            var LonLat = bounds.getCenterLonLat();
            var cenY = LonLat.lon;
            var cenX = LonLat.lat;

            var ControlBounds = new OpenLayers.Bounds(
                cenY - width,
                cenX - height,
                cenY + width,
                cenX + height
            );
            GeomPoly = ControlBounds.toGeometry();

            var numCmp = feature.geometry.components.length;
            var node, line;
            var defFeat;
            var cmpToRemoved = [];
            for (var i = 0; i < numCmp; i++) {
                component = feature.geometry.components[i];

                if (component.CLASS_NAME.indexOf('Polygon') > -1) {
                    node = component.getVertices();
                    line = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(node));
                    if (line.geometry.intersects(GeomPoly)) {
                        cmpGeom = component.clone();
                        this.removedCmp = true;
                        cmpToRemoved.push(component);
                    }
                    continue;
                }

                if (component.intersects(GeomPoly)) {
                    cmpGeom = component.clone();
                    cmpToRemoved.push(component);
                }
            }
            if (cmpGeom) {
                for (i = 0; i < cmpToRemoved.length; i++) {
                    feature.geometry.removeComponents(cmpToRemoved[i]);
                    this.layer.renderer.eraseGeometry(cmpToRemoved[i]);
                }
                defFeat = new OpenLayers.Feature.Vector(cmpGeom);
            } else {
                return;
            }
        }
        this.feature = (defFeat) ? defFeat : feature;
        this.layer.drawFeature(feature);
        this.layer.addFeatures([this.feature], {
            silent: true
        });
        this.layer.drawFeature(this.feature);
        if (this.centerfeat) {
            this.layer.destroyFeatures(this.centerfeat, {
                silent: true
            });
        }
        if (this.toggleSelect()) {
            this.unselect(this.feature);
        } else {
            this.highlight(this.feature);
            //this.circleGeom = feature;
            this.setGeometryIntoModify(this.feature.geometry);
        }
    },
    unselect: function(feature) {
        // Store feature style for restoration later
        this.unhighlight(feature);
        OpenLayers.Util.removeItem(this.selectedFeatures, feature);
        this.layer.events.triggerEvent("featureunselected", {
            feature: feature
        });
    },


    unhighlight: function(feature) {
        this.layer.drawFeature(feature, "default");
        OpenLayers.Util.removeItem(this.selectedFeatures, feature);
        this.events.triggerEvent("featureunhighlighted", {
            feature: feature
        });
    },

    highlight: function(feature, randerIntent, add) {
        var layer = feature.layer;
        var cont = this.events.triggerEvent("beforefeaturehighlighted", {
            feature: feature
        });
        if (cont !== false) {
            this.events.triggerEvent("featureselected", {
                feature: feature
            });
            var style = randerIntent || 'select';
            this.layer.drawFeature(feature, style);
            (add) ? this.layer.addFeatures([feature], {
                silent: true
            }): this.selectedFeatures.push(feature);
            this.events.triggerEvent("featurehighlighted", {
                feature: feature
            });
        }
    },

    reset: function(vertex) {
        if (vertex)
            this.layer.destroyFeatures([vertex], {
                silent: true
            });

        if (this.moveVertex) this.layer.destroyFeatures([this.moveVertex], {
            silent: true
        });

        if (this.line)
            this.layer.destroyFeatures([this.line], {
                silent: true
            });

        if (this.selectedFeatures.length > 0 && this.modified) {
            this.layer.destroyFeatures(this.selectedFeatures, {
                silent: true
            });
        } else if (this.selectedFeatures.length > 0) {
            this.layer.drawFeature(this.selectedFeatures[0], "default");
        }

        this.feature = null;
        this.circleGeom = null;

        if (this.feature)
            this.layer.destroyFeatures(this.virtualVertices, {
                silent: true
            });

        if (this.dragControl.map)
            this.dragControl.deactivate();

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
        var num = Math.round(this.virtualVertices.length / 2);
        this.moveVertex = this.virtualVertices[num];


        this.layer.addFeatures([this.moveVertex], {
            silent: true
        });
        this.createLineForDrag();
        this.handler.deactivate();

        if (!this.dragControl.map) {
            this.map.addControl(this.dragControl);
        }
        this.feature = this.line;

        this.dragControl.activate();
    },

    createLineForDrag: function() {
        var geom = this.feature.geometry;
        this.line = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString([])
        );

        //Polygon
        if (geom.CLASS_NAME === 'OpenLayers.Geometry.Polygon') {
            this.firstPoint = geom.components[0].components[0];
            this.secondPoint = geom.components[0].components[geom.components[0].components.length - 2];
            this.line.geometry.addComponent(this.firstPoint, this.line.geometry.components.length);
            this.line.geometry.addComponent(this.moveVertex.geometry, this.line.geometry.components.length);
            this.line.geometry.addComponent(this.secondPoint, this.line.geometry.components.length);
        }

        //Line
        else if (geom.CLASS_NAME === 'OpenLayers.Geometry.LineString') {
            this.firstPoint = geom.components[0];
            this.secondPoint = geom.components[geom.components.length - 1];
            this.line.geometry.addComponent(this.firstPoint, this.line.geometry.components.length);
            this.line.geometry.addComponent(this.moveVertex.geometry, this.line.geometry.components.length);
            this.line.geometry.addComponent(this.secondPoint, this.line.geometry.components.length);
        }

        this.layer.addFeatures([this.line], {
            silent: true
        });
        this.layer.drawFeature(this.line, this.renderIntent);
    },


    deactivate: function() {
        this.reset();
        this.handler.deactivate();
        this.selectedFeatures = [];
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
        this.selectedFeatures = [];
        this.active = true;
        this.events.triggerEvent("activate", {
            obj: this
        });
    }

});

OpenLayers.Control.Intersect = OpenLayers.Class(OpenLayers.Control, {

    active: false,
    IntersectPoint: [],
    selectedFeatures: [],
    select: true,
    vector: null,
    toogleSelect: true,
    toggleKey: 'shiftKey',
    EVENT_TYPES: ["activate", "deactivate", "featureselected", "featureunselected", "beforefeaturehighlighted", "featurehighlighted"],

    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        if (!this.vector) {
            throw "No vector Layer";
        }
        var callbacks = {
            click: this.clickFeature,
            clickout: this.clickoutFeature
        };

        this.callbacks = OpenLayers.Util.extend(callbacks, this.callbacks);
        if (this.select) {
            this.handler = new OpenLayers.Handler.Feature(
                this, this.vector, this.callbacks, {
                    clickTolerance: 100
                }
            )
        }

    },

    toggleSelect: function() {
        return ((this.handler.evt &&
            this.handler.evt[this.toggleKey]) || this.toogleSelect);
    },

    clickFeature: function(feature) {

        if (this.toggleSelect() && this.isSelected(feature)) {
            this.unselect(feature);
            while (this.IntersectPoint.length > 0) {
                var f = this.IntersectPoint.shift();
                this.vector.destroyFeatures(f);
                f.destroy();
            }
        } else {
            this.highlight(feature);
        }
        this.doIntersection();
    },

    isSelected: function(feature) {
        for (var i = 0; i < this.selectedFeatures.length; i++) {
            if (this.selectedFeatures[i].id == feature.id) {
                return true;
            }
        }

        return false;
    },

    unselect: function(feature) {
        // Store feature style for restoration later
        this.unhighlight(feature);
        OpenLayers.Util.removeItem(this.selectedFeatures, feature);
        this.vector.events.triggerEvent("featureunselected", {
            feature: feature
        });
        this.doIntersection();
    },

    unhighlight: function(feature) {
        this.vector.drawFeature(feature, "default");
        this.events.triggerEvent("featureunhighlighted", {
            feature: feature
        });
    },

    highlight: function(feature, randerIntent, add) {
        var layer = feature.layer;
        var cont = this.events.triggerEvent("beforefeaturehighlighted", {
            feature: feature
        });
        if (cont !== false) {

            this.events.triggerEvent("featureselected", {
                feature: feature
            });
            var style = randerIntent || 'select';
            this.vector.drawFeature(feature, style);
            (add) ? this.vector.addFeatures([feature]): this.selectedFeatures.push(feature);
            this.events.triggerEvent("featurehighlighted", {
                feature: feature
            });
        }
    },

    deactivate: function() {
        if (this.handler) {
            this.handler.deactivate();
        }
        while (this.selectedFeatures.length > 0) {
            this.unselect(this.selectedFeatures.shift());
        }
        while (this.IntersectPoint.length > 0) {
            var f = this.IntersectPoint.shift();
            this.vector.destroyFeatures(f);
            f.destroy();
        }
        this.active = false;
        this.events.triggerEvent("deactivate", this);
    },

    deactivateHandler: function() {
        if (this.handler) {
            return this.handler.deactivate();
        }
    },

    activate: function() {
        if (this.handler) {
            this.handler.activate();
        }
        this.active = true;
        this.events.triggerEvent("activate", this);
    },

    getIntersects: function() {
        var LineIntesects = [];
        var LineCmpOwn = [];
        var collectionItems = [];
        var i, len;
        for (i = 0; i < this.selectedFeatures.length; i++) {
            if (this.selectedFeatures[i] && this.selectedFeatures[i].geometry.CLASS_NAME.toLowerCase().indexOf('collection') > -1) {
                var c = this.selectedFeatures[i].geometry.components;
                for (var s = 0; s < c.length; s++) {
                    collectionItems.push(c);
                }
                this.selectedFeatures.splice(i, 1);
            }
        }
        if (collectionItems.length > 0) {
            this.selectedFeatures.concat(collectionItems);
        }

        for (i = 0; i < this.selectedFeatures.length; i++) {
            if (this.selectedFeatures[i].geometry.CLASS_NAME.toLowerCase().indexOf('point') > -1) {
                continue;
            }

            if (this.selectedFeatures[i].geometry.CLASS_NAME.toLowerCase().indexOf('line') > -1 || this.selectedFeatures[i].geometry.CLASS_NAME.toLowerCase().indexOf('path') > -1) {
                var cmp = this.selectedFeatures[i].geometry.components;
            } else {
                var cmp = this.selectedFeatures[i].geometry.components[0].components;
            }
            for (var t = 0; t < cmp.length - 1; t++) {
                var geom = new OpenLayers.Geometry.LineString([cmp[t], cmp[t + 1]]);
                OpenLayers.Util.extend(geom, {
                    parent_id: this.selectedFeatures[i].id
                });

                LineCmpOwn.push(geom)
            }

        }

        for (i = 0; i < LineCmpOwn.length; i++) {
            var LinetoInspect = LineCmpOwn[i];
            for (t = i; t < LineCmpOwn.length; t++) {


                if (LinetoInspect.equals(LineCmpOwn[t]) == false &&
                    LinetoInspect.intersects(LineCmpOwn[t]) == true &&
                    LinetoInspect.parent_id !== LineCmpOwn[t].parent_id
                ) {
                    var objIntesctGeom = {};
                    objIntesctGeom.line1 = LineCmpOwn[t];
                    objIntesctGeom.line2 = LinetoInspect;
                    LineIntesects.push(objIntesctGeom);
                }
            }
        }

        return LineIntesects;
    },

    getPointIntersectsOfLine: function(line1, line2) {
        var ka, kb, x, y, f;

        var xa1 = line1.components[0].x;
        var xa2 = line1.components[1].x;
        var ya1 = line1.components[0].y;
        var ya2 = line1.components[1].y;

        var xb1 = line2.components[0].x;
        var xb2 = line2.components[1].x;
        var yb1 = line2.components[0].y;
        var yb2 = line2.components[1].y;

        var t, d, sameX = false,
            sameY = false;
        if (ya2.toFixed(5) == ya1.toFixed(5)) {
            //TODO
            alert('Same');
            t = ya1
            sameX = true
                //return;
        } else {
            t = (ya2 - ya1)
        }
        ka = (xa2 - xa1) / t;

        if (yb2.toFixed(5) == yb1.toFixed(5)) {
            //TODO
            alert('Same');
            sameY = true
            d = yb1;
            //return;
        } else {
            d = (yb2 - yb1)
        }
        kb = (xb2 - xb1) / d;

        if (!sameX) {
            x = (xb1 - xa1 - kb * yb1 + ka * ya1) / (ka - kb);
        } else {
            x = t
        }
        if (!sameY) {
            y = xa1 + ka * (x - ya1);
        } else {
            y = d;
        }
        f = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(y, x), {});
        this.highlight(f, null, true);
        this.IntersectPoint.push(f);

        return f;
    },


    doIntersection: function() {
        this.events.triggerEvent("beforeintersection", this);

        var lines = this.getIntersects();
        var intPoints = []
        for (var s = 0; s < lines.length; s++) {
            var point = this.getPointIntersectsOfLine(lines[s].line1, lines[s].line2);
            intPoints.push(point);
        }

        this.events.triggerEvent("afterintersection", {
            points: intPoints
        });
    },

    destroy: function() {
        this.deactivate();
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },

    CLASS_NAME: "OpenLayers.Control.Intersect"
});

OpenLayers.Control.RotateFeature = OpenLayers.Class(OpenLayers.Control, {
    layer         : null,
    feature       : null,
    selectControl : null,
    drawControl   : null,
    modified      : false,
    reference     : false,
    refAngle      : 0,
    refOrigin     : null,
    EVENT_TYPES   : ["feature_selected", "activate", "deactivate"],
    CLASS_NAME    : "OpenLayers.Control.RotateFeature",
    initialize    : function(layer, options) {
        this.layer = layer;
        OpenLayers.Control.prototype.initialize.apply(this, [options]);

        this.selectControl = new OpenLayers.Control.SelectFeature(
            layer, {
                onBeforeSelect : this.beforeSelectFeature,
                onSelect       : this.selectFeature,
                onUnselect     : this.unselectFeature,
                scope          : this
            }
        );

        this.drawControl = new OpenLayers.Control.DrawFeature(
            layer, OpenLayers.Handler.Path, {
                handlerOptions : {
                    maxVertices    : 2
                }
            }
        );
    },

    destroy: function() {
        this.layer = null;
        this.selectControl.destroy();
        this.drawControl.destroy();
        OpenLayers.Control.prototype.destroy.apply(this, []);
    },

    activate: function() {
        this.selectControl.activate();
        OpenLayers.Control.prototype.activate.apply(this, arguments);
        this.events.triggerEvent("activate", this);
        this.reference = false;
    },

    deactivate: function() {
        var deactivated = false,
            feature = this.feature,
            valid = feature && feature.geometry && feature.layer;


        if (!this.modified && this.feature && this._originalGeometry) {
            this.layer.eraseFeatures([this.feature], {
                silent: true
            });
            this.feature.geometry = this._originalGeometry.clone();
        }

        if (this.feature) {
            this.feature._sketch = false;
        }

        // the return from the controls is unimportant in this case
        if (OpenLayers.Control.prototype.deactivate.apply(this, arguments)) {
            this.drawControl.deactivate();
            if (valid) {
                this.selectControl.unselect.apply(this.selectControl, [feature]);
            }
            this.layer.events.un({
                "sketchcomplete": this.onSketchComplete,
                "sketchmodified": this.onSketchModified,
                scope: this
            });

            this.selectControl.deactivate();
            deactivated = true;
        }
        this.events.triggerEvent("deactivate", this);
        return deactivated;
    },

    cancel: function() {
        if (this.active) {
            this.deactivate();
            this.activate();
        }
    },

    beforeSelectFeature: function(feature) {
        return this.layer.events.triggerEvent("beforefeaturemodified", {
            feature: feature
        });
    },

    selectFeature: function(feature) {
        var modified = feature.modified;
        this.feature = feature;
        this.modified = false;

        if (this.events.triggerEvent("feature_selected", {
                feature: feature
            }) === false) {
            return;
        }

        this.layer.events.on({
            "sketchcomplete": this.onSketchComplete,
            "sketchmodified": this.onSketchModified,
            scope: this
        });

        this.selectControl.deactivate();
        this.drawControl.activate();

        this.refAngle = 0;
        this.refOrigin = null;

        // keep track of geometry modifications
        if (feature.geometry && !(modified && modified.geometry)) {
            this._originalGeometry = feature.geometry.clone();
        }
    },

    onSketchModified: function(event) {
        var coords = event.feature.geometry.getVertices(),
            lng = coords.length,
            origin, vertex, geometry, angle;

        if (lng == 1 && this.refOrigin) {
            this.drawControl.handler.dodajXY(this.refOrigin.x, this.refOrigin.y);
        }

        if (this.reference) {
            this.feature._sketch = false;
            return;
        }

        if (lng > 1) {
            origin = new OpenLayers.Geometry.Point(coords[0].x, coords[0].y);
            vertex = new OpenLayers.Geometry.Point(coords[1].x, coords[1].y);

            this.layer.eraseFeatures([this.feature], {
                silent: true
            });
            this.feature.geometry = this._originalGeometry.clone();

            geometry = this.feature.geometry;

            angle = Math.atan2(vertex.y - origin.y, vertex.x - origin.x) * 180 / Math.PI - this.refAngle;

            geometry.rotate(angle, origin);

            this._originX = origin.x;
            this._originY = origin.y;
            this._angle = angle;

            this.layer.drawFeature(this.feature, this.selectControl.renderIntent);
            this.feature._sketch = true;
        }
    },

    onSketchComplete: function(e) {
        var coords, origin, vertex, rotateOrigin, arcOrigin;

        if (this.reference) {
            coords = e.feature.geometry.getVertices();

            origin = new OpenLayers.Geometry.Point(coords[0].x, coords[0].y);
            vertex = new OpenLayers.Geometry.Point(coords[1].x, coords[1].y);
            this.refAngle = Math.atan2(vertex.y - origin.y, vertex.x - origin.x) * 180 / Math.PI;
            this.reference = false;
            if (!this.refOrigin) {
                this.refOrigin = origin;
            }
        } else {
            this.layer.events.un({
                "sketchcomplete": this.onSketchComplete,
                "sketchmodified": this.onSketchModified,
                scope: this
            });

            this.modified = true;
            this.onSketchModified(e);

            if (OpenLayers.Util.objectIsArch(this.feature.geometry)) {
                rotateOrigin = new OpenLayers.Geometry.Point(this._originX, this._originY);
                arcOrigin = new OpenLayers.Geometry.Point(this.feature.geometry.attributes.OriginX, this.feature.geometry.attributes.OriginY);

                arcOrigin.rotate(this._angle, rotateOrigin);

                this.feature.geometry.attributes.OriginX = arcOrigin.x;
                this.feature.geometry.attributes.OriginY = arcOrigin.y;

                if ((this.feature.geometry.attributes.EndBearing - this.feature.geometry.attributes.StartBearing == 2 * Math.PI) === false) {

                    if (this.feature.geometry.attributes.EndBearing - this._angle * Math.PI / 180 < 0) {
                        this._angle -= 360;
                    }

                    if (this.feature.geometry.attributes.EndBearing - this._angle * Math.PI / 180 > 2 * Math.PI) {
                        this._angle += 360;
                    }

                    this.feature.geometry.attributes.StartBearing =
                        this.feature.geometry.attributes.StartBearing - this._angle * Math.PI / 180;

                    this.feature.geometry.attributes.EndBearing =
                        this.feature.geometry.attributes.EndBearing - this._angle * Math.PI / 180;
                }
            }

            this.feature._sketch = false;
            this.setFeatureState();

            this.layer.events.triggerEvent("featuremodified", {
                feature: this.feature
            });
            this.drawControl.deactivate();
            this.selectControl.unselect.apply(this.selectControl, [this.feature]);

            this.selectControl.activate();
        }
        return false;
    },

    unselectFeature: function(feature) {
        this.feature.modified = false;
        this.feature = null;
        this.drawControl.deactivate();

        this.layer.events.triggerEvent("afterfeaturemodified", {
            feature: feature,
            modified: this.modified
        });
        this.modified = false;
    },

    setFeatureState: function() {
        if (this.feature.state != OpenLayers.State.INSERT &&
            this.feature.state != OpenLayers.State.DELETE) {
            this.feature.state = OpenLayers.State.UPDATE;
            if (this.modified && this._originalGeometry) {
                this.feature.modified = OpenLayers.Util.extend(this.feature.modified, {
                    geometry: this._originalGeometry
                });
                delete this._originalGeometry;
            }
        }
    },

    setMap: function(map) {
        this.selectControl.setMap(map);
        this.drawControl.setMap(map);
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },

    workReference: function() {
        var coords = this.drawControl.handler.line.geometry.getVertices();

        if (this.active) {
            this.reference = true;
            if (this.drawControl.active && this.drawControl.handler.line) {
                if (coords.length > 1) {
                    this.refOrigin = new OpenLayers.Geometry.Point(coords[0].x, coords[0].y);
                    this.drawControl.handler.destroyFeature();
                    if (this.feature && this._originalGeometry) {
                        this.layer.eraseFeatures([this.feature], {
                            silent: true
                        });
                        this.feature.geometry = this._originalGeometry.clone();
                        this.layer.drawFeature(this.feature, this.selectControl.renderIntent);
                    }
                }
            }
        }
    },

    crtajZadaniTekst: function(tekst) {
        if (this.active) {
            if (tekst.length > 0) {
                if ((tekst != ".") && (tekst != ",")) {
                    if (!(!isNaN(parseFloat(tekst)) && isFinite(tekst))) {
                        this.drawControl.handler.drawText(tekst);
                    }

                    if (this.drawControl.active && this.drawControl.handler.line) {
                        this.drawControl.handler.drawText("@100000000<" + (90 - tekst));
                    }
                }
            }
        }
    }
});

OpenLayers.Control.ScaleFeature = OpenLayers.Class(OpenLayers.Control, {
    layer:            null,
    feature:          null,
    selectControl:    null,
    drawControl:      null,
    modified:         false,
    reference:        false,
    scaleDenominator: 1,
    refOrigin:        null,
    EVENT_TYPES:      ["feature_selected", "activate", "deactivate"],
    CLASS_NAME:       "OpenLayers.Control.ScaleFeature",
    initialize:       function(layer, options) {
        this.layer = layer;
        OpenLayers.Control.prototype.initialize.apply(this, [options]);

        this.selectControl = new OpenLayers.Control.SelectFeature(
            layer, {
                onBeforeSelect: this.beforeSelectFeature,
                onSelect: this.selectFeature,
                onUnselect: this.unselectFeature,
                scope: this
            }
        );

        this.drawControl = new OpenLayers.Control.DrawFeature(
            layer, OpenLayers.Handler.Path, {
                handlerOptions: {
                    maxVertices: 2
                }
            }
        );
    },

    destroy: function() {
        this.layer = null;
        this.selectControl.destroy();
        this.drawControl.destroy();
        OpenLayers.Control.prototype.destroy.apply(this, []);
    },

    activate: function() {
        OpenLayers.Control.prototype.activate.apply(this, arguments);
        this.events.triggerEvent("activate", this);
        this.reference = false;
        this.selectControl.activate();
    },

    deactivate: function() {
        //vidi jel zadnji objekt modified i ako nije onda vrati _originalGeometry
        if (!this.modified && this.feature && this._originalGeometry) {
            this.layer.eraseFeatures([this.feature], {
                silent: true
            });
            this.feature.geometry = this._originalGeometry.clone();
        }
        if (this.feature) {
            this.feature._sketch = false;
        }
        var deactivated = false;
        // the return from the controls is unimportant in this case
        if (OpenLayers.Control.prototype.deactivate.apply(this, arguments)) {
            this.drawControl.deactivate();
            var feature = this.feature;
            var valid = feature && feature.geometry && feature.layer;
            if (valid) {
                this.selectControl.unselect.apply(this.selectControl, [feature]);
            }
            this.layer.events.un({
                "sketchcomplete": this.onSketchComplete,
                "sketchmodified": this.onSketchModified,
                scope:            this
            });

            this.selectControl.deactivate();
            deactivated = true;
        }
        this.events.triggerEvent("deactivate", this);
        return deactivated;
    },

    cancel: function() {
        if (this.active) {
            this.deactivate();
            this.activate();
        }
    },

    beforeSelectFeature: function(feature) {
        return this.layer.events.triggerEvent("beforefeaturemodified", {
            feature: feature
        });
    },

    selectFeature: function(feature) {
        this.feature = feature;
        this.modified = false;
        if (this.events.triggerEvent("feature_selected", {
                feature: feature
            }) === false) {
            return;
        }

        this.layer.events.on({
            "sketchcomplete": this.onSketchComplete,
            "sketchmodified": this.onSketchModified,
            scope:            this
        });
        this.selectControl.deactivate();
        this.drawControl.activate();

        this.scaleDenominator = 1;
        this.refOrigin        = null;

        // keep track of geometry modifications
        var modified = feature.modified;
        if (feature.geometry && !(modified && modified.geometry)) {
            this._originalGeometry = feature.geometry.clone();
        }
    },

    onSketchModified: function(event) {
        var koord = event.feature.geometry.getVertices();
        var lng = koord.length;

        if (lng == 1 && this.refOrigin) {
            this.drawControl.handler.dodajXY(this.refOrigin.x, this.refOrigin.y);
        }

        if (this.reference) {
            this.feature._sketch = false;
            return;
        } //dok radi referentno
        if (lng > 1) {
            var origin = new OpenLayers.Geometry.Point(koord[0].x, koord[0].y);

            this.layer.eraseFeatures([this.feature], {
                silent: true
            });

            this.feature.geometry = this._originalGeometry.clone();

            var geometry = this.feature.geometry;

            var scale = OpenLayers.Util.distanceBetween2Coordinates(koord[0].x, koord[0].y, koord[1].x, koord[1].y) / this.scaleDenominator;
            geometry.resize(scale, origin, 1);

            this._originX = origin.x;
            this._originY = origin.y;
            this._scale   = scale;

            this.layer.drawFeature(this.feature, this.selectControl.renderIntent);
            this.feature._sketch = true;
        }
    },

    onSketchComplete: function(e) {
        if (this.reference) {
            var koord = e.feature.geometry.getVertices();
            this.scaleDenominator = OpenLayers.Util.distanceBetween2Coordinates(koord[0].x, koord[0].y, koord[1].x, koord[1].y);
            this.reference = false;
            if (!this.refOrigin) {
                this.refOrigin = new OpenLayers.Geometry.Point(koord[0].x, koord[0].y);
            }
        } else {
            this.layer.events.un({
                "sketchcomplete": this.onSketchComplete,
                "sketchmodified": this.onSketchModified,
                scope: this
            });

            this.modified = true;
            this.onSketchModified(e); //da podesi još jednom za svaki sluèaj na zadnju koordinatu

            if (OpenLayers.Util.objectIsArch(this.feature.geometry)) { //da popravim podatke o luku-kruznici
                var origin = new OpenLayers.Geometry.Point(this._originX, this._originY);

                var a = this.feature.geometry.attributes;
                var arcOrigin = new OpenLayers.Geometry.Point(a.OriginX, a.OriginY);
                arcOrigin.resize(this._scale, origin, 1);

                var radius = a.radius * this._scale;
                var kruznica = OpenLayers.Util.arc(arcOrigin.x, arcOrigin.y, radius, a.StartBearing, a.EndBearing);
                this.layer.eraseFeatures([this.feature], {
                    silent: true
                });
                this.feature.geometry = kruznica.geometry;
                this.layer.drawFeature(this.feature, this.selectControl.renderIntent);
            }

            this.feature._sketch = false;
            this.setFeatureState();

            this.layer.events.triggerEvent("featuremodified", {
                feature: this.feature
            });
            this.drawControl.deactivate();
            this.selectControl.unselect.apply(this.selectControl, [this.feature]);

            this.selectControl.activate();
        }
        return false;
    },

    unselectFeature: function(feature) {
        this.feature.modified = false;
        this.feature = null;
        this.drawControl.deactivate();

        this.layer.events.triggerEvent("afterfeaturemodified", {
            feature: feature,
            modified: this.modified
        });
        this.modified = false;
    },

    setFeatureState: function() {
        if (this.feature.state != OpenLayers.State.INSERT &&
            this.feature.state != OpenLayers.State.DELETE) {
            this.feature.state = OpenLayers.State.UPDATE;
            if (this.modified && this._originalGeometry) {
                var feature = this.feature;
                feature.modified = OpenLayers.Util.extend(feature.modified, {
                    geometry: this._originalGeometry
                });
                delete this._originalGeometry;
            }
        }
    },

    setMap: function(map) {
        this.selectControl.setMap(map);
        this.drawControl.setMap(map);
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },

    radiReferentno: function() {
        if (this.active) {
            this.reference = true;
            //this.feature._sketch = false;
            if (this.drawControl.active && this.drawControl.handler.line) {
                var koord = this.drawControl.handler.line.geometry.getVertices();
                var lng = koord.length;
                if (lng > 1) {
                    this.refOrigin = new OpenLayers.Geometry.Point(koord[0].x, koord[0].y);
                    this.drawControl.handler.destroyFeature();
                    if (this.feature && this._originalGeometry) {
                        this.layer.eraseFeatures([this.feature], {
                            silent: true
                        });
                        this.feature.geometry = this._originalGeometry.clone();
                        this.layer.drawFeature(this.feature, this.selectControl.renderIntent);
                    }
                }
            }
        }
    },

    crtajZadaniTekst: function(tekst) {
        if (this.active) {
            if (tekst.length > 0) {
                if ((tekst != ".") && (tekst != ",")) {
                    if (!(!isNaN(parseFloat(tekst)) && isFinite(tekst))) {
                        this.drawControl.handler.crtajZadaniTekst(tekst); //prosljedjujem, mozda handler zna kaj bi s time
                    }

                    if (this.drawControl.active && this.drawControl.handler.line) {
                        this.drawControl.handler.crtajZadaniTekst("@" + tekst + "<0"); //simulira da sam napravio liniju pod zadanim kutem
                    }
                }
            }
        }
    },

    CLASS_NAME: "OpenLayers.Control.ScaleFeature"
});

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

OpenLayers.Handler.Path = OpenLayers.Class(OpenLayers.Handler.Path, {
    ortho         : false,
    perpendicular : false,
    down: function(evt) {
        var stopDown = this.stopDown;

        //right click return;
        if (evt.button === 2) {
            return !stopDown;
        }
        if (this.freehandMode(evt)) {
            stopDown = true;
        }
        if ( !this.touch && (!this.lastDown ||
             !this.passesTolerance(this.lastDown, evt.xy, this.pixelTolerance)) ) {
                this.modifyFeature(evt.xy, !!this.lastUp);
        }

        this.mouseDown = true;
        this.lastDown = evt.xy;
        this.stoppedDown = stopDown;
        return !stopDown;
    },

    modifyFeature: function(pixel, drawing) {
        var lonlat = this.control.map.getLonLatFromPixel(pixel);
        if (!this.line) {
            this.createFeature(pixel);
        }

        this.point.geometry.x = lonlat.lon;
        this.point.geometry.y = lonlat.lat;

        if (this.perpendicular) {
            this.drawPerpendicular();
        }

        if (this.ortho) {
            this.drawOrtho();
        }

        this.callback("modify", [this.point.geometry, this.getSketch(), drawing]);
        this.point.geometry.clearBounds();
        this.drawFeature();
    },

    setOrtho: function(o) {
        this.ortho = o;
    },

    setPerpendicular: function(p) {
        this.perpendicular = p;
    },

    addXY: function(x, y) {
        var pixel;
        if (!this.line) {
            pixel = this.control.map.getPixelFromLonLat(new OpenLayers.LonLat(x, y));
            this.createFeature(pixel);
            this.lastDown = pixel;
            this.drawing = true;
        }

        this.line.geometry.addComponent(
            new OpenLayers.Geometry.Point(x, y),
            this.line.geometry.components.length - (!this.polygon ? 1 : 2)
        );

        this.drawFeature();
        delete this.redoStack;

        if (this.line.geometry.components.length === this.maxVertices + 1) {
            this.finishGeometry();
        }
    },

    drawPerpendicular: function() {
        var koord, lng, beforelastX, beforeLastY, lastX, LastY, mouseX, mouseY,
            distance, directionBeforeLast, directionLast, alphat, angleSnap;

        if (!this.line) {
            return;
        }

        koord = this.line.geometry.getVertices();
        lng   = koord.length;

        if (lng > 2) {
            beforelastX           = koord[lng - 3].x;
            beforeLastY           = koord[lng - 3].y;
            lastX                 = koord[lng - 2].x;
            LastY                 = koord[lng - 2].y;
            mouseX                = this.point.geometry.x;
            mouseY                = this.point.geometry.y;
            distance              = OpenLayers.Util.distanceBetween2Coordinates(
                                          lastX, LastY, mouseX, mouseY
                                      );
            directionBeforeLast   = OpenLayers.Util.wayAngle(
                                          lastX, LastY, beforelastX, beforeLastY
                                      );
            directionLast         = OpenLayers.Util.wayAngle(
                                          lastX, LastY, mouseX, mouseY
                                      );
            alphat                = Math.PI - directionBeforeLast + directionLast;
            angleSnap             = OpenLayers.Util.rad(90) *
                                      Math.round(alphat / OpenLayers.Util.rad(90));
            definitiveOrient      = Math.PI + angleSnap + directionBeforeLast;
            distance              = distance * Math.cos(definitiveOrient - directionLast);
            this.point.geometry.x = lastX + distance * Math.sin(definitiveOrient);
            this.point.geometry.y = LastY + distance * Math.cos(definitiveOrient);
        }
    },

    drawOrtho: function() {
        var koord = this.line.geometry.getVertices(),
            lng   = koord.length,
            lastX, lastY, mouseX, mouseY, dX, dY;

        if (lng > 1) {
            lastX  = koord[lng - 2].x;
            lastY  = koord[lng - 2].y;
            mouseX = this.point.geometry.x;
            mouseY = this.point.geometry.y;
            dX     = mouseX - lastX;
            dY     = mouseY - lastY;

            if (Math.abs(dX) > Math.abs(dY)) {
                this.point.geometry.x = lastX + dX;
                this.point.geometry.y = lastY;
            } else {
                this.point.geometry.x = lastX;
                this.point.geometry.y = lastY + dY;
            }
        }
    },

    drawText: function(text) {
        var relative          = false,
            distanceAngle     = false,
            angleRelOnLastSeg = false,
            sNum              = text.split(","),
            coord             = this.line.geometry.getVertices(),
            lng               = coord.length,
            coordX, coordY, lastX, lastY;

        if (this.active) {
            if (text.length > 0) {
                if ((text != ".") && (text != ",")) {

                    if (text.charAt(0) == "@") {
                        relative = true;
                        text = text.slice(1);
                    }

                    if (text.search("<") != -1) {
                        if (text.search("<<") != -1) {
                            angleRelOnLastSeg = true;
                            text = text.replace("<<", "<");
                        }

                        if (text.lastIndexOf("<") == text.indexOf("<")) {
                            distanceAngle = true;
                            text = text.replace("<", ",");
                        }
                    }

                    for (var i = 0; i < sNum.length; i++) {
                        if (!(!isNaN(parseFloat(sNum[i])) && isFinite(sNum[i]))) {
                            console.error("Error input not number!");
                            return;
                        }
                    }

                    switch (sNum.length) {
                        case 1: //only last number
                            this.directionAndDistance(Number(sNum));
                            break;
                        case 2: //two number
                            if (distanceAngle) {
                                this.angleAndDistance(
                                    relative, angleRelOnLastSeg, Number(sNum[0]), Number(sNum[1])
                                );
                            } else { //coordinates
                                coordX = Number(sNum[0]);
                                coordY = Number(sNum[1]);
                                if (relative) {
                                    if (lng > 1) {
                                        lastX = coord[lng - 2].x;
                                        lastY = coord[lng - 2].y;
                                        this.addXY(lastX + coordX, lastY + coordY);
                                    }
                                } else {
                                    this.addXY(coordX, coordY);
                                }
                            }
                            break;
                        default:
                            alert("Error input!");
                            break;
                    }
                }
            }
        }
    },

    directionAndDistance: function(distance) {
        var koord = this.line.geometry.getVertices(),
              lng = koord.length,
            lastX, LastY, mouseX, mouseY, lastDirection, x, y;

        if (lng > 1) {
            lastX = koord[lng - 2].x;
            LastY = koord[lng - 2].y;
            mouseX = this.point.geometry.x;
            mouseY = this.point.geometry.y;

            lastDirection = OpenLayers.Util.wayAngle(lastX, LastY, mouseX, mouseY);
                x         = lastX + distance * Math.sin(lastDirection);
                y         = LastY + distance * Math.cos(lastDirection);

            this.addXY(x, y);
        }
    },

    angleAndDistance: function(relative, angleRelOnLastSeg, distance, angle) {
        var direction = OpenLayers.Util.rad(angle),
            dX        = distance * Math.sin(direction),
            dY        = distance * Math.cos(direction),
            koord     = this.line.geometry.getVertices(),
            lng       = koord.length,
            lastX, lastY, beforelastX, beforelastY;

        if (relative) {
            if (lng > 1) {
                lastX = koord[lng - 2].x;
                LastY = koord[lng - 2].y;

                if (angleRelOnLastSeg) {
                    if (lng > 2) {
                        beforelastX = koord[lng - 3].x;
                        beforeLastY = koord[lng - 3].y;
                        direction  += OpenLayers.Util.wayAngle(
                                            beforelastX, beforeLastY, lastX, LastY
                                        );

                        dX = distance * Math.sin(direction);
                        dY = distance * Math.cos(direction);
                    }
                }

                this.addXY(lastX + dX, LastY + dY);
            }
        } else {
            this.addXY(dX, dY);
        }

    }
});

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
