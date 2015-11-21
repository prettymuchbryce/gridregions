"use strict";

var EasyStar = require('easystarjs');
var PriorityQueue = EasyStar.PriorityQueue;

const TRANSITION_CONSTANT = 6;

const SIDE_TOP = 0;
const SIDE_RIGHT = 1;
const SIDE_BOTTOM = 2;
const SIDE_LEFT = 3;
const INVERSE_SIDE_MAP = {
    1: SIDE_LEFT,
    3: SIDE_RIGHT,
    2: SIDE_TOP,
    0: SIDE_BOTTOM
};

let idCounter = 0;

/**
* GridRegions constructor.
*
* @param {number} gridSize - The width and height of the grid. Must be divisible by regionSize.
* @param {Object} options - An object containing options.
* @param {number} options.regionSize - The size of individual regions. Defaults to 10.
**/
var GridRegions = function(gridSize, options) {
    var regionSize = 10 || options.regionSize;
    var regionMap = [];
    var entityMap = {};

    if (gridSize % regionSize !== 0) {
        throw new Error("Grid size must be divisible by " + regionSize);
    }

    options = options || {};

    for (var y = 0; y < gridSize/regionSize; y++) {
        for (var j = 0; j < regionSize; j++) {
            regionMap.push([]);
        }
        for (var x = 0; x < gridSize/regionSize; x++) {
            var region = new Region(x, y);
            for (var yy = 0; yy < regionSize; yy++) {
                region.collisionGrid.push([]);
                for (var xx = 0; xx < regionSize; xx++) {
                    region.collisionGrid[yy].push(0);
                    regionMap[(y*regionSize)+yy].push(region);
                }
            }
        }
    }

    for (var y = 0; y < gridSize/regionSize; y++) {
        for (var x = 0; x < gridSize/regionSize; x++) {
            if (x < (gridSize/regionSize)-1) {
                recomputeLinks(regionMap[y*regionSize][x*regionSize], SIDE_RIGHT);
            }
            if (y < (gridSize/regionSize)-1) {
                recomputeLinks(regionMap[y*regionSize][x*regionSize], SIDE_BOTTOM);
            }
        }
    }

    /**
    * Adds an entity to the board.
    *
    * @param {Object} entity - An object which represents an entity in the game.
    * @param {Object} options - An object containing options.
    * @param {boolean} options.collidable - Whether or not the entity is collidable on the board.
    * @param {number} x - The X position to place the entity.
    * @param {number} y - The Y position to place the entity.
    *
    * @return {number} A unique id representing this entity within GridRegions
    **/
    this.addEntity = function(entity, options, x, y) {
        var region = getRegion(x, y);
        var localX = x - region.x * regionSize;
        var localY = y - region.y * regionSize;
        var entity = new Entity(entity, x, y, localX, localY, options.collidable);
        region.addEntity(entity);

        entityMap[entity.id] = entity;

        if (options.collidable) {
            recomputeAllRegionLinks(region);
        }

        return entity.id;
    };

    /**
    * Moves an existing entity on the board.
    *
    * @param {number} id - The unique ID of the entity.
    * @param {number} newX - The X position to move the entity to.
    * @param {number} newY - The Y position to move the entity to.
    **/
    this.moveEntity = function(id, newX, newY) {
        if (!isWithinBounds(newX, newY)) {
            throw new Error("Can't move entity. newX and newY are out of bounds.");
        }

        var entity = entityMap[id];

        if (!entity) {
            throw new Error("Can't move entity. No entity by id " + id);
        }

        entity.x = newX;
        entity.y = newY;
        entity.localX = newX % regionSize;
        entity.localY = newY % regionSize;

        var region = getRegion(entity.x, entity.y);
        var newRegion = getRegion(newX, newY);

        if (region !== newRegion) {
            region.removeEntity(entity);
            newRegion.addEntity(entity);
        }

        if (entity.collidable) {
            recomputeAllRegionLinks(region);
            if (region !== newRegion) {
                recomputeAllRegionLinks(newRegion);
            }
        }
    };

    /**
    * Removes an entity from the board
    *
    * @param {number} id - The ID of the entity to remove.
    **/
    this.removeEntity = function(id) {
        var entity = entityMap[id];

        if (!entity) {
            throw new Error("Can't remove entity. No entity by id " + id);
        }

        var region = getRegion(entity.x, entity.y);
        region.removeEntity(entity);

        if (entity.collidable) {
            recomputeAllRegionLinks(region);
        }

        delete entityMap[id];
    };

    /**
    * Returns the internal representation of the entity.
    *
    * @param {number} id - The ID of the entity to get.
    *
    * @param {Object} The entity, or undefined if it does not exist.
    **/
    this.getEntity = function(id) {
        return entityMap[id];
    }

    /**
    * Returns an entity nearby the position specified. Returns the first
    * entity found by region. Not necessarily the closest entity.
    * This is accomplished by performing a BFS on the abstract graph.
    *
    * @param {number} x - The x position to start the search.
    * @param {number} y - The y position to start the search.
    * @param {Object} query - A query for the search. This will match any
    * first-level properties on the entity object provided to CreateEntity.
    *
    * @return {Object} An object representing the entity, or undefined if not found.
    **/
    this.getNearbyEntity = function(x, y, query) {
        if (!isWithinBounds(x, y)) {
            throw new Error("Can't get nearby entity. x and y are out of bounds.");
        }

        var startRegion = getRegion(x, y);
        var startNode = insertNode(startRegion, x, y);
        var searchNode = new SearchNode(startNode, undefined);

        var openList = [searchNode];
        var visited = {};
        while (openList.length > 0) {
            var candidate = openList.pop();
            var candidateRegion = getRegion(candidate.node.x, candidate.node.y);
            for (var i = 0; i < candidateRegion.entities.length; i++) {
                if (candidateRegion.entities[i].doesMatchQuery(query)) {
                    if (doesAccessiblePathExist(candidateRegion, candidate.node.localX, candidate.node.localY, candidateRegion.entities[i].localX, candidateRegion.entities[i].localY)) {
                        var entity = candidateRegion.entities[i];
                        return entity.getPublic();
                    }
                }
            }

            for (var i = 0; i < candidate.node.edges.length; i++) {
                var neighbor = candidate.node.edges[i].neighbor;
                if (!visited[neighbor.id]) {
                    var searchNode = new SearchNode(neighbor, candidate);
                    openList.push(searchNode);
                    visited[neighbor.id] = neighbor;
                }
            }
        }

        return undefined;
    };

    /**
    * Sets a tile as "impassable" or "collidable".
    *
    * @param {number} x - The X position of the tile to make impassable.
    * @param {number} y - The Y Position of the tile to make impassable.
    **/
    this.setImpassableTile = function(x, y) {
        if (!isWithinBounds(x, y)) {
            throw new Error("Can't set impassable tile. x and y are out of bounds.");
        }

        var region = getRegion(x, y);
        var localX = x % regionSize;
        var localY = y % regionSize;

        region.collisionGrid[localY][localX] = 1;

        recomputeAllRegionLinks(region);
    };

    /**
    * Sets a tile as "passable" 
    *
    * @param {number} x - The X position of the tile to make passable.
    * @param {number} y - The Y Position of the tile to make passable.
    **/
    this.unsetImpassableTile = function(x, y) {
        if (!isWithinBounds(x, y)) {
            throw new Error("Can't unset impassable tile. x and y are out of bounds.");
        }

        var region = getRegion(x, y);
        var localX = x % regionSize;
        var localY = y % regionSize;

        region.collisionGrid[localY][localX] = 0;

        recomputeAllRegionLinks(region);
    };

    /**
    * Retuns a full specific path from the start position to the end position.
    * This is accomplished by finding a path from the start X to a region node,
    * then searching the abstract graph for a path to the target region. Once
    * the target region is found, a path is computed from the end region node
    * to the desired end point. If smoothing is true, an extra step is added to
    * smooth the path.
    *
    * Smoothing is applied by taking each node in the solution and checking
    * whether or not we can reach a subsequent node in the path in a straight line.
    * If so - This straight path replaces the previous sequence between the nodes.
    *
    * @param {number} startX - The X position to start the search
    * @param {number} startY - The Y position to start the search
    * @param {number} endX - The X position to end the search
    * @param {number} endY - The Y position to end the search
    * @param {boolean} smoothing - Whether or not to apply smoothing.
    *
    * @return {Array} - The full path, or undefined if it does not exist.
    **/
    this.getFullPath = function(startX, startY, endX, endY, smoothing) {
        if (!isWithinBounds(startX, startY) || !isWithinBounds(endX, endY)) {
            throw new Error("Can't get full path. start x or y are out of bounds.");
        }

        if (smoothing === undefined) {
            smoothing = true;
        }

        var path = this.getAbstractPath(startX, startY, endX, endY); 

        if (!path) {
            return undefined;
        }

        var pf = new EasyStar.js();
        pf.enableSync();
        pf.setAcceptableTiles([0]);
        if (options.diagonals) {
            pf.enableDiagonals();
        }

        var fullPath = [];
        for (var i = 0; i < path.length-1; i++) {
            var start = path[i];
            var end = path[i+1];
            var startRegion = getRegion(start.x, start.y);
            var endRegion = getRegion(end.x, end.y);
            if (startRegion === endRegion) {
                pf.setGrid(startRegion.collisionGrid);
                for (var j = 0; j < startRegion.entities.length; j++) {
                    if (startRegion.entities[j].collidable) {
                        pf.avoidAdditionalPoint(startRegion.entities[j].localX, startRegion.entities[j].localY);
                    }
                }
                pf.findPath(start.x % regionSize, start.y % regionSize, end.x % regionSize, end.y % regionSize, function(p) {
                    if (!p) {
                        throw new Error("An unexpected error has occurred with GridRegions. Please report this issue to github.com/prettymuchbryce/gridregions")
                    }

                    // Convert coordinates to global space
                    for (var j = 0; j < p.length; j++) {
                        p[j].x = p[j].x + startRegion.x * regionSize;
                        p[j].y = p[j].y + startRegion.y * regionSize;
                    }

                    fullPath = fullPath.concat(p);
                });
                pf.calculate();
            } else {
                fullPath.push({x: start.x, y: start.y});
            }
        }

        if (smoothing) {
            fullPath = smoothPath(fullPath);
        }

        return fullPath;
    };

    /**
    * Retuns an abstract path from the start region to the end region using
    * region nodes. An abstract path typically consists of:
    * 
    * 1. The start node.
    * 2. A list of region nodes.
    * 3. The end node
    *
    * @param {number} startX - The X position to start the search
    * @param {number} startY - The Y position to start the search
    * @param {number} endX - The X position to end the search
    * @param {number} endY - The Y position to end the search
    *
    * @return {Array} - The abstract path, or undefined if it does not exist.
    */
    this.getAbstractPath = function(startX, startY, endX, endY) {
        if (!isWithinBounds(startX, startY) || !isWithinBounds(endX, endY)) {
            throw new Error("Can't get abstract path. start x or y are out of bounds.");
        }

        var startRegion = getRegion(startX, startY);
        var endRegion = getRegion(endX, endY);

        if (!isPassable(endX, endY)) {
            return undefined;
        }

        var localEndX = endX - Math.floor(endX / regionSize)*regionSize;
        var localEndY = endY - Math.floor(endY / regionSize)*regionSize;

        var openList = [];

        var startNode = insertNode(startRegion, startX, startY);
        var endNode = insertNode(endRegion, endX, endY);
        var searchNode = new SearchNode(startNode, undefined, endX, endY, 0, getDistance(startX, startY, endX, endY));
        var openList = new EasyStar.PriorityQueue("bestGuessDistance", EasyStar.PriorityQueue.MIN_HEAP);
        openList.insert(searchNode);


        var visited = {};
        while (openList.length > 0) {
            var candidate = openList.shiftHighestPriorityElement();
            var candidateRegion = getRegion(candidate.node.x, candidate.node.y);
            if (candidateRegion === endRegion) {
                if (doesAccessiblePathExist(candidateRegion, candidate.node.localX, candidate.node.localY, localEndX, localEndY)) {
                    var path = [];
                    var node = candidate;
                    while (node.parent) {
                        path.push(node.node);
                        node = node.parent;
                    }
                    path.push(node.node);
                    path.reverse();
                    path.push(endNode);
                    return path;
                }
            }

            for (var i = 0; i < candidate.node.edges.length; i++) {
                var neighbor = candidate.node.edges[i].neighbor;
                var cost = candidate.node.edges[i].cost;
                if (!visited[neighbor.id]) {
                    var searchNode = new SearchNode(neighbor, candidate, endX, endY, candidate.costSoFar + cost, getDistance(neighbor.x, neighbor.y, endX, endY));
                    openList.insert(searchNode);
                    visited[neighbor.id] = neighbor;
                } else {
                    if (neighbor.costSoFar + cost < visited[neighbor.id].costSoFar) {
                        visited[neighbor.id].costSoFar = neighbor.costSoFar + cost;
                        visited[neighbor.id].parent = neighbor;
                    }
                }
            }
        }

        return undefined;
    };

    function doesAccessiblePathExist(region, fromX, fromY, toX, toY) {
        if (!isPassable(toX, toY)) {
            return false
        }
        var pf = getEasyStarForRegion(region);
        var result;
        pf.findPath(fromX, fromY, toX, toY, function(p) {
            if (p) {
                result = true;
            } else {
                result = false;
            }
        });
        pf.calculate();

        return result;
    }

    function insertNode(region, x, y) {
        var pf = getEasyStarForRegion(region);
        var node = new Node(-1, x, y, x - Math.floor(x/regionSize)*regionSize, y - Math.floor(y/regionSize)*regionSize);
        for (var j = 0; j < region.nodes.length; j++) {
            pf.findPath(node.localX, node.localY, region.nodes[j].localX, region.nodes[j].localY, function(p) {
                if (p) {
                    node.edges.push({cost: p.length, neighbor: region.nodes[j]});
                }
            });
            pf.calculate();
        }
        return node;
    }

    function isWithinBounds(x, y) {
        if (x < 0 || x >= gridSize || x < 0 || x >= gridSize) {
            return false;
        }
        
        return true;
    }

    function getNeighborRegion(region, side) {
        var xOffset = 0;
        var yOffset = 0;

        switch(side) {
            case SIDE_RIGHT:
                xOffset = 1;
                break;
            case SIDE_BOTTOM:
                yOffset = 1;
                break;
            case SIDE_LEFT:
                xOffset = -1;
                break;
            case SIDE_TOP:
                yOffset = -1;
                break;
        }

        var neighborRegion = getRegion((region.x * regionSize) + (xOffset * regionSize), (region.y * regionSize) + (yOffset * regionSize));

        return neighborRegion
    }

    function removeNodes(region, side) {
        var nodes = [];
        for (var i = 0; i < region.nodes.length; i++) {
            if (region.nodes[i].side === side) {
                nodes.push(region.nodes[i]);
                region.nodes.splice(i, 1);
                i--;
            }
        }

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            for (var j = 0; j < node.edges.length; j++) {
                var neighbor = node.edges[j].neighbor;
                removeEdgesToNode(neighbor, node);
            }
        }
    }

    function removeEdgesToNode(node, removeNode) {
        for (var i = 0; i < node.edges.length; i++) {
            if (node.edges[i].neighbor === removeNode) {
                node.edges.splice(i, 1);
                i--;
            }
        }
    }

    function recomputeAllRegionLinks(region) {
        if (region.y > 0) {
            var neighborRegion = getNeighborRegion(region, SIDE_TOP);
            removeNodes(neighborRegion, SIDE_BOTTOM);
            removeNodes(region, SIDE_TOP);
        }
        if (region.x < gridSize/regionSize-1) {
            var neighborRegion = getNeighborRegion(region, SIDE_RIGHT);
            removeNodes(neighborRegion, SIDE_LEFT);
            removeNodes(region, SIDE_RIGHT);
        }
        if (region.y < gridSize/regionSize-1) {
            var neighborRegion = getNeighborRegion(region, SIDE_BOTTOM);
            removeNodes(neighborRegion, SIDE_TOP);
            removeNodes(region, SIDE_BOTTOM);
        }
        if (region.x > 0) {
            var neighborRegion = getNeighborRegion(region, SIDE_LEFT);
            removeNodes(neighborRegion, SIDE_RIGHT);
            removeNodes(region, SIDE_LEFT);
        }
        if (region.y > 0) {
            var neighborRegion = getNeighborRegion(region, SIDE_TOP);
            recomputeLinks(region, SIDE_TOP);
            buildIntraRegionLinksSide(neighborRegion, SIDE_BOTTOM);
        }
        if (region.x < gridSize/regionSize-1) {
            var neighborRegion = getNeighborRegion(region, SIDE_RIGHT);
            recomputeLinks(region, SIDE_RIGHT);
            buildIntraRegionLinksSide(neighborRegion, SIDE_LEFT);
        }
        if (region.y < gridSize/regionSize-1) {
            var neighborRegion = getNeighborRegion(region, SIDE_BOTTOM);
            recomputeLinks(region, SIDE_BOTTOM);
            buildIntraRegionLinksSide(neighborRegion, SIDE_TOP);
        }
        if (region.x > 0) {
            var neighborRegion = getNeighborRegion(region, SIDE_LEFT);
            recomputeLinks(region, SIDE_LEFT);
            buildIntraRegionLinksSide(neighborRegion, SIDE_RIGHT);
        }
    }

    function buildIntraRegionLinksSide(region, side) {
        var pf = getEasyStarForRegion(region);

        // Build intra-region links
        for (var i = 0; i < region.nodes.length; i++) {
            var node = region.nodes[i];
            if (node.side !== side) {
                continue;
            }
            for (var j = 0; j < region.nodes.length; j++) {
                if (node === region.nodes[j]) {
                    continue;
                }
                pf.findPath(node.localX, node.localY, region.nodes[j].localX, region.nodes[j].localY, function(p) {
                    if (p) {
                        node.edges.push({cost: p.length, neighbor: region.nodes[j]});
                        if (region.nodes[j].side !== side) {
                            region.nodes[j].edges.push({cost: p.length, neighbor: node});
                        }
                    }
                });
                pf.calculate();
            }
        }
    }

    function buildIntraRegionLinks(region) {
        var pf = getEasyStarForRegion(region);

        // Build intra-region links
        for (var i = 0; i < region.nodes.length; i++) {
            var node = region.nodes[i];
            for (var j = 0; j < region.nodes.length; j++) {
                if (node === region.nodes[j]) {
                    continue;
                }
                pf.findPath(node.localX, node.localY, region.nodes[j].localX, region.nodes[j].localY, function(p) {
                    if (p) {
                        node.edges.push({cost: p.length, neighbor: region.nodes[j]});
                    }
                });
                pf.calculate();
            }
        }
    }

    function recomputeLinks(region, side) {
        // All of this xOffset yOffset stuff is just convenience to allow for this
        // function to work with any side.

        // It's kind of mindfucky so might be worth just separating out the code
        // to be conditional depending on the side.

        var xOffset = 0;
        var yOffset = 0;

        switch(side) {
            case SIDE_RIGHT:
                xOffset = 1;
                break;
            case SIDE_BOTTOM:
                yOffset = 1;
                break;
            case SIDE_LEFT:
                xOffset = -1;
                break;
            case SIDE_TOP:
                yOffset = -1;
                break;
        }

        var neighborRegion = getRegion((region.x * regionSize) + (xOffset * regionSize), (region.y * regionSize) + (yOffset * regionSize));

        // startX and startY represent the non-local position where the iteration starts
        // For example, searching side right of the region at 0,0 should yield a startX of 9
        // and a startY of 0.
        var startX = region.x * regionSize + (((regionSize-1) + ((regionSize-1) * xOffset))/2) * Math.abs(xOffset);
        var startY = region.y * regionSize + (((regionSize-1) + ((regionSize-1) * yOffset))/2) * Math.abs(yOffset);

        var link;
        for (var i = 0; i < regionSize; i++) {
            var addX = i * Math.abs(yOffset);
            var addY = i * Math.abs(xOffset);
            var neighborXOffset = xOffset;
            var neighborYOffset = yOffset;
            if (isPassable(startX + addX, startY + addY) && 
                isPassable(startX + addX + neighborXOffset, startY + addY + neighborYOffset)) {
                if (!link) {
                    link = {
                        start: i,
                        size: 1
                    };
                } else {
                    link.size++;
                }
            } else {
                if (link) {
                    createLink(link);
                    link = undefined;
                }
            }
        }

        if (link) {
            createLink(link);
        }

        buildIntraRegionLinks(region);

        // Build inter-region links
        function createLink(link) {
            if (link.size < TRANSITION_CONSTANT) {
                // nodeX and nodeY here represent offsets from the start positions (they aren't local positions)
                var nodeX = (link.start + Math.floor(link.size/2)) * Math.abs(yOffset);
                var nodeY = (link.start + Math.floor(link.size/2)) * Math.abs(xOffset);

                // In order to get a node's local position we simply % regionSize
                var node = new Node(side, startX + nodeX, startY + nodeY, startX % regionSize + nodeX, startY % regionSize + nodeY);
                var neighborNode = new Node(INVERSE_SIDE_MAP[side], startX + nodeX + neighborXOffset, startY + nodeY + neighborYOffset, (startX + nodeX + neighborXOffset) % regionSize, (startY + nodeY + neighborYOffset) % regionSize);

                if (neighborNode.localY < 0) {
                    throw new Error(startY)
                }

                node.edges.push({cost: 1, neighbor: neighborNode});
                neighborNode.edges.push({cost: 1, neighbor: node});

                region.nodes.push(node);
                neighborRegion.nodes.push(neighborNode);
            } else {
                var nodeX1 = (link.start) * Math.abs(yOffset);
                var nodeY1 = (link.start) * Math.abs(xOffset);
                var nodeX2 = (link.start + (link.size-1)) * Math.abs(yOffset);
                var nodeY2 = (link.start + (link.size-1)) * Math.abs(xOffset);

                var node1 = new Node(side, startX + nodeX1, startY + nodeY1, startX % regionSize + nodeX1, startY % regionSize + nodeY1);
                var neighborNode1 = new Node(INVERSE_SIDE_MAP[side], startX + nodeX1 + neighborXOffset, startY + nodeY1 + neighborYOffset, (startX + nodeX1 + neighborXOffset) % regionSize, (startY + nodeY1 + neighborYOffset) % regionSize);
                node1.edges.push({cost: 1, neighbor: neighborNode1});
                neighborNode1.edges.push({cost: 1, neighbor: node1});

                var node2 = new Node(side, startX + nodeX2, startY + nodeY2, startX % regionSize + nodeX2, startY % regionSize + nodeY2);
                var neighborNode2 = new Node(INVERSE_SIDE_MAP[side], startX + nodeX2 + neighborXOffset, startY + nodeY2 + neighborYOffset, (startX + nodeX2 + neighborXOffset) % regionSize, (startY + nodeY2 + neighborYOffset) % regionSize);
                node2.edges.push({cost: 1, neighbor: neighborNode2});
                neighborNode2.edges.push({cost: 1, neighbor: node2});

                region.nodes.push(node1, node2);

                neighborRegion.nodes.push(neighborNode1, neighborNode2);
            }
        }
    }

    function isPassable(x, y) {
        var region = getRegion(x, y);

        if (region.collisionGrid[y - Math.floor(y/regionSize)*regionSize][x - Math.floor(x/regionSize)*regionSize] === 1) {
            return false;
        }

        for (var i = 0; i < region.entities.length; i++) {
            if (region.entities[i].x === x && region.entities[i].y === y && region.entities[i].collidable) {
                return false;
            }
        }

        return true;
    }

    function smoothPath(path) {
        for (var i = 0; i < path.length-2; i++) {
            var start = path[i];
            for (var j = i+2; j < path.length; j++) {
                var end = path[j];
                var points = [];
                var success = false;
                if (start.x === end.x) {
                    for (var q = 1; q < Math.abs(start.y - end.y)+1; q++) {
                        var add;
                        if (start.y > end.y) {
                            add = -1 * q;
                        } else {
                            add = 1 * q;
                        }
                        if (!(path[i+q].y === start.y+add && path[i+q].x === start.x) && isPassable(start.x, start.y+add)) {
                            points.push({x: start.x, y: start.y+add});
                            success = true;
                        } else {
                            success = false;
                            break;
                        }
                    }
                } else if (start.y === end.y) {
                    for (var q = 0; q < Math.abs(start.x - end.x); q++) {
                        var add;
                        if (start.x > end.x) {
                            add = -1 * q;
                        } else {
                            add = 1 * q;
                        }
                        if (!(path[i+q].x === start.x+add && path[i+q].y === start.y) && isPassable(start.x+add, start.y)) {
                            points.push({x: start.x+add, y: start.y});
                            success = true;
                        } else {
                            success = false;
                            break;
                        }
                    }
                }

                if (success) {
                    var start = path.slice(0, i+1);
                    var end = path.slice(j);
                    var fullPath = start.concat(points).concat(end);
                    return smoothPath(fullPath)
                }
            }
        }
        return path;
    }

    function getEasyStarForRegion(region) {
        var pf = new EasyStar.js();
        pf.enableSync();
        pf.setGrid(region.collisionGrid);
        for (var i = 0; i < region.entities.length; i++) {
            if (region.entities[i].collidable) {
                pf.avoidAdditionalPoint(region.entities[i].localX, region.entities[i].localY);
            }
        }
        pf.setAcceptableTiles([0]);
        if (options.diagonals) {
            pf.enableDiagonals();
        }

        return pf;
    }

    function getRegion(x, y) {
        return regionMap[y][x];
    }
}


var getDistance = function(x1,y1,x2,y2) {
    return Math.sqrt( (x2-=x1)*x2 + (y2-=y1)*y2 );
};

var Entity = function(data, x, y, localX, localY, collidable) {
    this.data = data;
    this.x = x;
    this.localX = localX;
    this.y = y;
    this.localY = localY;
    this.collidable = collidable;
    this.id = idCounter;
    idCounter++;

    this.getPublic = function() {
        return {
            data: data,
            x: JSON.parse(JSON.stringify(this.x)),
            y: JSON.parse(JSON.stringify(this.y)),
            collidable: JSON.parse(JSON.stringify(this.collidable)),
            id: JSON.parse(JSON.stringify(this.id))
        }
    };

    this.doesMatchQuery = function(query) {
        for (var key in query) {
            var value = query[key];
            if (this.data[key] !== value) {
                return false
            }
        }
        return true;
    };
};

var Region = function(x, y) {
    this.x = x;
    this.y = y;
    this.entities = [];
    this.nodes = [];
    this.collisionGrid = [];

    this.addEntity = function(entity) {
        this.entities.push(entity);
    };

    this.removeEntity = function(entity) {
        for (var i = 0; i < this.entities.length; i++) {
            if (this.entities[i] === entity) {
                this.entities.splice(i, 1);
                return;
            }
        }
    };
};

var SearchNode = function(node, parent, endX, endY, costSoFar, simpleDistanceToTarget) {
    this.endX = endX;
    this.endY = endY;
    this.parent = parent;
    this.node = node;
    this.costSoFar = costSoFar;
    this.simpleDistanceToTarget = simpleDistanceToTarget;
    this.bestGuessDistance = function() {
        return this.costSoFar + this.simpleDistanceToTarget;
    };
};

var Node = function(side, x, y, localX, localY) {
    this.side = side;
    this.id = idCounter;
    idCounter++;
    this.x = x;
    this.y = y;
    this.localX = localX;
    this.localY = localY;
    this.edges = [];
};

module.exports = GridRegions;