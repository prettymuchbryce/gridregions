require('expose?$!expose?jQuery!jquery');
require('bootstrap-webpack');
require('../css/main.less');

var PIXI = require('./pixi.js'); 
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;

var TILE_SIZE = 8;
var REGION_SIZE = 10;
var width;
var height;
var stage = new PIXI.Stage();

var renderer = new PIXI.CanvasRenderer($(window).innerWidth(), $(window).height());
renderer.backgroundColor = 0xFFFFFF;
$('#demo').html(renderer.view);
var regionGridContainer;

window.onresize = resize;

resize();

function resize() {
    width = $('#demo').innerWidth();
    height = $('#demo').height();
    renderer.resize(width, height);
    if (regionGridContainer) {
        stage.removeChild(regionGridContainer);
    }
    regionGridContainer = generateRegionGrid(width, height);
    stage.addChild(regionGridContainer);
}

function generateRegionGrid(width, height) {
    var container = new PIXI.Container();

    for (var y = 0; y < Math.floor(height/TILE_SIZE/REGION_SIZE)*REGION_SIZE; y++) {
        for (var x = 0; x < Math.floor(width/TILE_SIZE/REGION_SIZE)*REGION_SIZE; x++) {
            var graphics = new PIXI.Graphics();
            graphics.beginFill([0xffffff, 0x000000][(Math.floor(x/REGION_SIZE) + Math.floor(y/REGION_SIZE)) % 2])
            graphics.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            graphics.endFill();
            graphics.alpha = 0.1;
            container.addChild(graphics);
        }
    }
    return container;
}

function animate() {
    requestAnimationFrame( animate );
    renderer.render(stage);
}

requestAnimationFrame( animate );