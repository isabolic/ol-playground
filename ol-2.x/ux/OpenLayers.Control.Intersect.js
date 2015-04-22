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
