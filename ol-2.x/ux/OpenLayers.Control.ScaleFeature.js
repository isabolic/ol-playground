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
