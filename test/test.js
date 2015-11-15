var Grids = require('../src/gridregions.js');
var assert = require('assert');

describe('getAbstractPath', function() {
    it.skip('should get a path for a 20x20 grid with no obstacles',function() {
        //assert.equal
        var grid = new Grids(20);
        // grid.addEntity({}, { collidable: true }, 9, 0);
        ///
        // grid.setImpassableTile(9, 5);
        var list = grid.getAbstractPath(0,0,15,15);

        assert.equal(6, list.length);
        assert.equal(0, list[0].x);
        assert.equal(0, list[0].y);
        assert.equal(10, list[4].x);
        assert.equal(10, list[4].y);
        assert.equal(15, list[5].x);
        assert.equal(15, list[5].y);
    });
    it.skip('should get a path for a 20x20 grid with an obstacle',function() {
        var grid = new Grids(20);
        var list = grid.getAbstractPath(0,0,0,15);
        // grid.setImpassableTile(9, 5);
        assert.equal(6, list.length);
        assert.equal(0, list[0].x);
        assert.equal(0, list[0].y);
        assert.equal(10, list[4].x);
        assert.equal(10, list[4].y);
        assert.equal(15, list[5].x);
        assert.equal(15, list[5].y);
    });
});

var grid = new Grids(20, {diagonals: true});
grid.addEntity({ type: 'monkey' }, { collidable: true }, 0, 0);
grid.addEntity({ type: 'banana' }, { collidable: false }, 15, 15);

var point = grid.getNearbyEntity(0, 0, {type: 'banana'});
console.log(point);

//        var grid = new Grids(20, {diagonals: true});
//         // grid.addEntity({}, { collidable: true }, 9, 0);
//         ///
//         grid.setImpassableTile(9,10);
//         grid.setImpassableTile(9,11);
//         grid.setImpassableTile(9,12);
//         grid.setImpassableTile(9,13);
//         grid.setImpassableTile(9,14);
//         grid.setImpassableTile(9,15);
//         grid.setImpassableTile(9,16);
//         grid.setImpassableTile(9,17);
//         grid.setImpassableTile(9,18);
//         grid.setImpassableTile(9,19);
//         grid.setImpassableTile(10,10);
//         grid.setImpassableTile(11,10);
//         grid.setImpassableTile(12,10);
//         grid.setImpassableTile(13,10);
//         grid.setImpassableTile(14,10);
//         var list = grid.getFullPath(0,0,15,15,false);
//     prettyPrintGrid(list);



// function prettyPrintGrid(path) {
//     var grid = [];
//     for (var y = 0; y < 20; y++) {
//         grid.push([]);
//         for (var x = 0; x < 20; x++) {
//             grid[y].push([' ']);
//         }
//     }
//     grid[10][9] = 'o';
//     grid[11][9] = 'o';
//     grid[12][9] = 'o';
//     grid[13][9] = 'o';
//     grid[14][9] = 'o';
//     grid[15][9] = 'o';
//     grid[16][9] = 'o';
//     grid[17][9] = 'o';
//     grid[18][9] = 'o';
//     grid[19][9] = 'o';
//     grid[10][10] = 'o';
//     grid[10][11] = 'o';
//     grid[10][12] = 'o';
//     grid[10][13] = 'o';
//     grid[10][14] = 'o';
//     for (var i = 0; i < path.length; i++) {
//         grid[path[i].y][path[i].x] = 'x';
//     }

//     for (var y = 0; y < 20; y++) {
//         console.log(grid[y].toString());
//     }
// }