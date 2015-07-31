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
