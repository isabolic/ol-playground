// including plugins
var gulp = require('gulp'),
  concat = require("gulp-concat"),
  uglify = require("gulp-uglify"),
  clean  = require('gulp-clean');


// task
gulp.task('minify',function () {
    return gulp.src(['ol-2.x/OpenLayers-2.11/OpenLayers-tidy.js',"ol-2.x/ux/*.js"]) // path to your files
    .pipe(uglify())
    .pipe(gulp.dest('dist/tmp'));
});

gulp.task('concat', ["minify"],  function () {
    return gulp.src('dist/tmp/*.js')
    .pipe(concat('compiled.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('concat-tidy', function () {
    return gulp.src(['ol-2.x/OpenLayers-2.11/OpenLayers-tidy.js',"ol-2.x/ux/*.js"])
    .pipe(concat('compiled-tidy.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('concat-only-extend', function () {
    return gulp.src(["ol-2.x/ux/*.js"])
    .pipe(concat('compiled-extendOnly-tidy.js'))
    .pipe(gulp.dest('dist/'));
});


gulp.task('cleanUp', ["concat"], function () {
    return gulp.src('dist/tmp', {read: false})
        .pipe(clean());
});

gulp.task('default', ['cleanUp', 'concat-tidy', 'concat-only-extend']);
