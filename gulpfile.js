const { src, dest, watch, series, parallel } = require('gulp')
const fileInclude = require('gulp-file-include')
const browserSync = require('browser-sync').create()
const plumber = require('gulp-plumber')
const del = require('del')
const cssimport = require('gulp-cssimport')
const autoprefixer = require('gulp-autoprefixer')
const csso = require('gulp-csso')
const rename = require('gulp-rename')
const shorthand = require('gulp-shorthand')
const sass = require('gulp-sass')(require('sass'))
const babel = require('gulp-babel')
const fonter = require('gulp-fonter')
const ttf2woff2 = require('gulp-ttf2woff2')
const gulpif = require('gulp-if')
const svgSprite = require('gulp-svg-sprite')
const directoryMap = require("gulp-directory-map")
const fs = require('fs-extra')

const isProd = process.argv.includes('--production')


const svgSpriteMap = () => {
    return src('src/svg/**/*.svg')
        .pipe(directoryMap({
            filename: 'svg-dir-map.json',
        }).on('error', errors => console.log(errors)))
        .pipe(dest('./src/svg'))
}

const spriteGen = []
if (process.argv.includes('build') && fs.pathExistsSync('./src/svg/svg-dir-map.json')) {
    const spriteMap = require("./src/svg/svg-dir-map.json")
    if (spriteMap !== undefined && spriteMap[''] !== undefined) {
        for (const key in spriteMap['']) {
            console.log('addSpriteFunction', key)
            spriteGen.push(() => {
                return src('./src/svg/' + key + '/*.svg')
                    .pipe(svgSprite({
                        mode: {
                            stack: {
                                sprite: key + '.svg',
                                dest: '.',
                                bust: false,
                            },
                        },
                    }))
                    .pipe(dest('./src/img/'))
            })
        }
    }
}

const html = () => {
    return src(isProd ? './src/**/*.html' : './src/*.html')
        .pipe(plumber())
        .pipe(gulpif(!isProd, fileInclude()))
        .pipe(dest(isProd ? './prod/' : './dev/'))
        .pipe(gulpif(!isProd, browserSync.stream()))
}

const scss = () => {
    return src(isProd ? './src/components/**/*.{scss,sass}' : './src/scss/*.{scss,sass}', { sourcemaps: !isProd })
        .pipe(cssimport())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(shorthand())
        .pipe(dest(isProd ? './prod/components/' : './dev/css/', { sourcemaps: !isProd }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(csso())
        .pipe(dest(isProd ? './prod/components/' : './dev/css/', { sourcemaps: !isProd }))
}

const js = () => {
    return src(isProd ? './src/js/**/*.js' : './src/js/*.js', { sourcemaps: !isProd })
        .pipe(babel())
        .pipe(dest(isProd ? './prod/js/' : './dev/js/', { sourcemaps: !isProd }))
}

const jsLib = () => {
    return src('./src/lib/js/**/*.js')
        .pipe(dest(isProd ? './prod/lib/js/' : './dev/lib/js/'))
}

const cssLib = () => {
    return src('./src/lib/css/**/*.css')
        .pipe(dest(isProd ? './prod/lib/css/' : './dev/lib/css/'))
}

const img = () => {
    return src('./src/img/*.{png,svg,jpg,jpeg}')
        .pipe(dest(isProd ? './prod/img/' : './dev/img/'))
}

const font = () => {
    return src('./src/font/*.{eot,ttf,otf,otc,ttc,woff,woff2,svg}')
        .pipe(fonter({
            formats: ['ttf', 'eot', 'woff']
        }))
        .pipe(dest(isProd ? './prod/font/' : './dev/font/'))
        .pipe(ttf2woff2())
        .pipe(dest(isProd ? './prod/font/' : './dev/font/'))
}

const server = () => {
    browserSync.init({
        server: {
            baseDir: './dev'
        }
    })
}

const clear = () => {
    return del(isProd ? './prod' : './dev')
}

const removeSVGMap = () => {
    return del('./src/svg/svg-dir-map.json')
}

const watcher = () => {
    watch("./src/**/*.html", html).on('all', browserSync.reload)
    watch("./src/**/*.scss", scss).on('all', browserSync.reload)
    watch("./src/**/*.js", js).on('all', browserSync.reload)
    watch("./src/**/*.{png,svg,jpg,jpeg}", img).on('all', browserSync.reload)
    watch("./src/**/*.{eot,ttf,otf,otc,ttc,woff,woff2,svg}", font).on('all', browserSync.reload)
}

const prod = series(
    ...spriteGen,
    clear,
    parallel(
        html,
        scss,
        js,
        jsLib,
        cssLib,
        img,
        font
    ),
    removeSVGMap
)
const dev = series(
    prod,
    parallel(
        watcher,
        server
    )
)

module.exports.svgSpriteMap = svgSpriteMap
module.exports.build = isProd ? prod : dev