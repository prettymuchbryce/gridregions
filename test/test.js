var Grids = require('../src/gridregions.js');
var assert = require('chai').assert;

describe('getAbstractPath', function() {
    it('should get a path for a 20x20 grid with no obstacles',function() {
        var grid = new Grids(20);
        var list = grid.getAbstractPath(0,0,15,15);
        assert.equal(6, list.length);
        assert.equal(0, list[0].x);
        assert.equal(0, list[0].y);
        assert.equal(10, list[4].x);
        assert.equal(10, list[4].y);
        assert.equal(15, list[5].x);
        assert.equal(15, list[5].y);
    });
    it('should get a path for a 20x20 grid with obstacles',function() {
        var grid = new Grids(20);
        grid.setImpassableTile(9, 0);
        grid.setImpassableTile(0, 9);
        var list = grid.getAbstractPath(0,0,15,15);
        assert.equal(6, list.length);
        assert.equal(0, list[0].x);
        assert.equal(0, list[0].y);
        assert.equal(10, list[4].x);
        assert.equal(10, list[4].y);
        assert.equal(15, list[5].x);
        assert.equal(15, list[5].y);
    });
    it('should fail to get the abstract path if there is no path', function() {
        var grid = new Grids(20);
        grid.setImpassableTile(0, 1);
        grid.setImpassableTile(1, 0);
        var list = grid.getAbstractPath(0,0,15,15);
        assert.isUndefined(list);
    });
    it('should fail to get the abstract path outside the grid', function() {
        var grid = new Grids(20);
        grid.setImpassableTile(0, 1);
        grid.setImpassableTile(1, 0);
        try {
            var list = grid.getAbstractPath(0,0,200,200);
        } catch (e) {
            assert.isDefined(e);
        }
    });
});

describe('getFullPath', function() {
    it('should get the full path for a 20x20 grid with no obstacles', function() {
        var grid = new Grids(20);
        var list = grid.getFullPath(0,0,15,15);
        assert.isDefined(list);
        assert.equal(0, list[0].x);
        assert.equal(0, list[0].y);
        assert.equal(15, list[list.length-1].x);
        assert.equal(15, list[list.length-1].y);
    });
    it('should fail to get the full path if there is no path', function() {
        var grid = new Grids(20);
        grid.setImpassableTile(0, 1);
        grid.setImpassableTile(1, 0);
        var list = grid.getFullPath(0,0,15,15);
        assert.isUndefined(list);
    });
});

describe('entities', function() {
    it('Find a nearby entity in another region',function() {
        var grid = new Grids(20, {diagonals: true});
        var data = { type: 'banana' };
        grid.addEntity({ type: 'monkey' }, { collidable: true }, 0, 0);
        grid.addEntity(data, { collidable: false }, 15, 15);
        var entity = grid.getNearbyEntity(0, 0, {type: 'banana'});
        assert.equal(entity.data, data);
    });
    it('Find a nearby entity in the same region',function() {
        var grid = new Grids(20, {diagonals: true});
        var data = { type: 'banana' };
        grid.addEntity(data, { collidable: false }, 0, 0);
        var entity = grid.getNearbyEntity(0, 0, {type: 'banana'});
        assert.equal(entity.data, data);
    });
    it('Fail to find a non-existent entity',function() {
        var grid = new Grids(20, {diagonals: true});
        var entity = grid.getNearbyEntity(0, 0, {type: 'banana'});
        assert.isUndefined(entity);
    });
    it('Succeeds in moving an entity',function() {
        var grid = new Grids(20, {diagonals: true});
        var id = grid.addEntity({}, { collidable: true }, 0, 0);
        grid.moveEntity(id, 5, 5)
        var entity = grid.getEntity(id)
        assert.equal(5, entity.x);
        assert.equal(5, entity.y);
    });
    it('Succeeds in removing an entity',function() {
        var grid = new Grids(20, {diagonals: true});
        var id = grid.addEntity({}, { collidable: true }, 0, 0);
        grid.removeEntity(id)
        var entity = grid.getEntity(id)
        assert.equal(undefined, entity);
    });
});