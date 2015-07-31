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
