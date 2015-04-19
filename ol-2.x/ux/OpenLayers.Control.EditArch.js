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
