/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var EasyStar = __webpack_require__(1);
	var PriorityQueue = EasyStar.PriorityQueue;

	var SIDE_TOP = 0;
	var SIDE_RIGHT = 1;
	var SIDE_BOTTOM = 2;
	var SIDE_LEFT = 3;
	var INVERSE_SIDE_MAP = {
	    1: SIDE_LEFT,
	    3: SIDE_RIGHT,
	    2: SIDE_TOP,
	    0: SIDE_BOTTOM
	};

	var TRANSITION_CONSTANT = 6;
	var idCounter = 0;

	var GridRegions = function (gridSize, options) {
	    var regionSize = 10;
	    var regionMap = [];
	    var entityMap = {};

	    if (gridSize % regionSize !== 0) {
	        throw new Error("Grid size must be divisible by " + regionSize);
	    }

	    options = options || {};

	    for (var y = 0; y < gridSize / regionSize; y++) {
	        for (var j = 0; j < regionSize; j++) {
	            regionMap.push([]);
	        }
	        for (var x = 0; x < gridSize / regionSize; x++) {
	            var region = new Region(x, y);
	            for (var yy = 0; yy < regionSize; yy++) {
	                region.collisionGrid.push([]);
	                for (var xx = 0; xx < regionSize; xx++) {
	                    region.collisionGrid[yy].push(0);
	                    regionMap[y * regionSize + yy].push(region);
	                }
	            }
	        }
	    }

	    for (var y = 0; y < gridSize / regionSize; y++) {
	        for (var x = 0; x < gridSize / regionSize; x++) {
	            if (x < gridSize / regionSize - 1) {
	                recomputeLinks(regionMap[y * regionSize][x * regionSize], SIDE_RIGHT);
	            }
	            if (y < gridSize / regionSize - 1) {
	                recomputeLinks(regionMap[y * regionSize][x * regionSize], SIDE_BOTTOM);
	            }
	        }
	    }

	    this.addEntity = function (entity, options, x, y) {
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

	    this.moveEntity = function (id, newX, newY) {
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

	    this.removeEntity = function (id) {
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

	    this.getNearbyEntity = function (x, y, query) {
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
	                        return { x: entity.x, y: entity.y, id: entity.id, data: entity.data };
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

	    this.setImpassableTile = function (x, y) {
	        if (!isWithinBounds(x, y)) {
	            throw new Error("Can't set impassable tile. x and y are out of bounds.");
	        }

	        var region = getRegion(x, y);
	        var localX = x % regionSize;
	        var localY = y % regionSize;

	        region.collisionGrid[localY][localX] = 1;

	        recomputeAllRegionLinks(region);
	    };

	    this.unsetImpassableTile = function (x, y) {
	        if (!isWithinBounds(x, y)) {
	            throw new Error("Can't unset impassable tile. x and y are out of bounds.");
	        }

	        var region = getRegion(x, y);
	        var localX = x % regionSize;
	        var localY = y % regionSize;

	        region.collisionGrid[localY][localX] = 0;

	        recomputeAllRegionLinks(region);
	    };

	    this.getFullPath = function (startX, startY, endX, endY, smoothing) {
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
	        for (var i = 0; i < path.length - 1; i++) {
	            var start = path[i];
	            var end = path[i + 1];
	            var startRegion = getRegion(start.x, start.y);
	            var endRegion = getRegion(end.x, end.y);
	            if (startRegion === endRegion) {
	                pf.setGrid(startRegion.collisionGrid);
	                for (var j = 0; j < startRegion.entities.length; j++) {
	                    if (startRegion.entities[j].collidable) {
	                        pf.avoidAdditionalPoint(startRegion.entities[j].localX, startRegion.entities[j].localY);
	                    }
	                }
	                pf.findPath(start.x % regionSize, start.y % regionSize, end.x % regionSize, end.y % regionSize, function (p) {
	                    if (!p) {
	                        throw new Error("An unexpected error has occurred with gamegamegrid.js. Please report this issue to github.com/prettymuchbryce/gamegridjs");
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
	                fullPath.push({ x: start.x, y: start.y });
	            }
	        }

	        if (smoothing) {
	            fullPath = smoothPath(fullPath);
	        }

	        return fullPath;
	    };

	    this.getAbstractPath = function (startX, startY, endX, endY) {
	        if (!isWithinBounds(startX, startY) || !isWithinBounds(endX, endY)) {
	            throw new Error("Can't get abstract path. start x or y are out of bounds.");
	        }

	        var startRegion = getRegion(startX, startY);
	        var endRegion = getRegion(endX, endY);

	        if (!isPassable(endX, endY)) {
	            return undefined;
	        }

	        var localEndX = endX - Math.floor(endX / regionSize) * regionSize;
	        var localEndY = endY - Math.floor(endY / regionSize) * regionSize;

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
	            return false;
	        }
	        var pf = getEasyStarForRegion(region);
	        var result;
	        pf.findPath(fromX, fromY, toX, toY, function (p) {
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
	        var node = new Node(-1, x, y, x - Math.floor(x / regionSize) * regionSize, y - Math.floor(y / regionSize) * regionSize);
	        for (var j = 0; j < region.nodes.length; j++) {
	            pf.findPath(node.localX, node.localY, region.nodes[j].localX, region.nodes[j].localY, function (p) {
	                if (p) {
	                    node.edges.push({ cost: p.length, neighbor: region.nodes[j] });
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

	        switch (side) {
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

	        var neighborRegion = getRegion(region.x * regionSize + xOffset * regionSize, region.y * regionSize + yOffset * regionSize);

	        return neighborRegion;
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
	        if (region.x < gridSize / regionSize - 1) {
	            var neighborRegion = getNeighborRegion(region, SIDE_RIGHT);
	            removeNodes(neighborRegion, SIDE_LEFT);
	            removeNodes(region, SIDE_RIGHT);
	        }
	        if (region.y < gridSize / regionSize - 1) {
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
	        if (region.x < gridSize / regionSize - 1) {
	            var neighborRegion = getNeighborRegion(region, SIDE_RIGHT);
	            recomputeLinks(region, SIDE_RIGHT);
	            buildIntraRegionLinksSide(neighborRegion, SIDE_LEFT);
	        }
	        if (region.y < gridSize / regionSize - 1) {
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
	                pf.findPath(node.localX, node.localY, region.nodes[j].localX, region.nodes[j].localY, function (p) {
	                    if (p) {
	                        node.edges.push({ cost: p.length, neighbor: region.nodes[j] });
	                        if (region.nodes[j].side !== side) {
	                            region.nodes[j].edges.push({ cost: p.length, neighbor: node });
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
	                pf.findPath(node.localX, node.localY, region.nodes[j].localX, region.nodes[j].localY, function (p) {
	                    if (p) {
	                        node.edges.push({ cost: p.length, neighbor: region.nodes[j] });
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

	        switch (side) {
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

	        var neighborRegion = getRegion(region.x * regionSize + xOffset * regionSize, region.y * regionSize + yOffset * regionSize);

	        // startX and startY represent the non-local position where the iteration starts
	        // For example, searching side right of the region at 0,0 should yield a startX of 9
	        // and a startY of 0.
	        var startX = region.x * regionSize + (regionSize - 1 + (regionSize - 1) * xOffset) / 2 * Math.abs(xOffset);
	        var startY = region.y * regionSize + (regionSize - 1 + (regionSize - 1) * yOffset) / 2 * Math.abs(yOffset);

	        var link;
	        for (var i = 0; i < regionSize; i++) {
	            var addX = i * Math.abs(yOffset);
	            var addY = i * Math.abs(xOffset);
	            var neighborXOffset = xOffset;
	            var neighborYOffset = yOffset;
	            if (isPassable(startX + addX, startY + addY) && isPassable(startX + addX + neighborXOffset, startY + addY + neighborYOffset)) {
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
	                var nodeX = (link.start + Math.floor(link.size / 2)) * Math.abs(yOffset);
	                var nodeY = (link.start + Math.floor(link.size / 2)) * Math.abs(xOffset);

	                // In order to get a node's local position we simply % regionSize
	                var node = new Node(side, startX + nodeX, startY + nodeY, startX % regionSize + nodeX, startY % regionSize + nodeY);
	                var neighborNode = new Node(INVERSE_SIDE_MAP[side], startX + nodeX + neighborXOffset, startY + nodeY + neighborYOffset, (startX + nodeX + neighborXOffset) % regionSize, (startY + nodeY + neighborYOffset) % regionSize);

	                if (neighborNode.localY < 0) {
	                    throw new Error(startY);
	                }

	                node.edges.push({ cost: 1, neighbor: neighborNode });
	                neighborNode.edges.push({ cost: 1, neighbor: node });

	                region.nodes.push(node);
	                neighborRegion.nodes.push(neighborNode);
	            } else {
	                var nodeX1 = link.start * Math.abs(yOffset);
	                var nodeY1 = link.start * Math.abs(xOffset);
	                var nodeX2 = (link.start + (link.size - 1)) * Math.abs(yOffset);
	                var nodeY2 = (link.start + (link.size - 1)) * Math.abs(xOffset);

	                var node1 = new Node(side, startX + nodeX1, startY + nodeY1, startX % regionSize + nodeX1, startY % regionSize + nodeY1);
	                var neighborNode1 = new Node(INVERSE_SIDE_MAP[side], startX + nodeX1 + neighborXOffset, startY + nodeY1 + neighborYOffset, (startX + nodeX1 + neighborXOffset) % regionSize, (startY + nodeY1 + neighborYOffset) % regionSize);
	                node1.edges.push({ cost: 1, neighbor: neighborNode1 });
	                neighborNode1.edges.push({ cost: 1, neighbor: node1 });

	                var node2 = new Node(side, startX + nodeX2, startY + nodeY2, startX % regionSize + nodeX2, startY % regionSize + nodeY2);
	                var neighborNode2 = new Node(INVERSE_SIDE_MAP[side], startX + nodeX2 + neighborXOffset, startY + nodeY2 + neighborYOffset, (startX + nodeX2 + neighborXOffset) % regionSize, (startY + nodeY2 + neighborYOffset) % regionSize);
	                node2.edges.push({ cost: 1, neighbor: neighborNode2 });
	                neighborNode2.edges.push({ cost: 1, neighbor: node2 });

	                region.nodes.push(node1, node2);

	                neighborRegion.nodes.push(neighborNode1, neighborNode2);
	            }
	        }
	    }

	    function isPassable(x, y) {
	        var region = getRegion(x, y);

	        if (region.collisionGrid[y - Math.floor(y / regionSize) * regionSize][x - Math.floor(x / regionSize) * regionSize] === 1) {
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
	        for (var i = 0; i < path.length - 2; i++) {
	            var start = path[i];
	            for (var j = i + 2; j < path.length; j++) {
	                var end = path[j];
	                var points = [];
	                var success = false;
	                if (start.x === end.x) {
	                    for (var q = 1; q < Math.abs(start.y - end.y) + 1; q++) {
	                        var add;
	                        if (start.y > end.y) {
	                            add = -1 * q;
	                        } else {
	                            add = 1 * q;
	                        }
	                        if (!(path[i + q].y === start.y + add && path[i + q].x === start.x) && isPassable(start.x, start.y + add)) {
	                            points.push({ x: start.x, y: start.y + add });
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
	                        if (!(path[i + q].x === start.x + add && path[i + q].y === start.y) && isPassable(start.x + add, start.y)) {
	                            points.push({ x: start.x + add, y: start.y });
	                            success = true;
	                        } else {
	                            success = false;
	                            break;
	                        }
	                    }
	                }

	                if (success) {
	                    var start = path.slice(0, i + 1);
	                    var end = path.slice(j);
	                    var fullPath = start.concat(points).concat(end);
	                    return smoothPath(fullPath);
	                }
	            }
	        }
	        return path;
	    };

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
	};

	var getDistance = function (x1, y1, x2, y2) {
	    return Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2);
	};

	var Entity = function (data, x, y, localX, localY, collidable) {
	    this.data = data;
	    this.x = x;
	    this.localX = localX;
	    this.y = y;
	    this.localY = localY;
	    this.collidable = collidable;
	    this.id = idCounter;
	    idCounter++;

	    this.doesMatchQuery = function (query) {
	        for (var key in query) {
	            var value = query[key];
	            if (this.data[key] !== value) {
	                return false;
	            }
	        }
	        return true;
	    };
	};

	var Region = function (x, y) {
	    this.x = x;
	    this.y = y;
	    this.entities = [];
	    this.nodes = [];
	    this.collisionGrid = [];

	    this.addEntity = function (entity) {
	        this.entities.push(entity);
	    };

	    this.removeEntity = function (entity) {
	        for (var i = 0; i < this.entities.length; i++) {
	            if (this.entities[i] === entity) {
	                this.entities.splice(i, 1);
	                return;
	            }
	        }
	    };
	};

	var SearchNode = function (node, parent, endX, endY, costSoFar, simpleDistanceToTarget) {
	    this.endX = endX;
	    this.endY = endY;
	    this.parent = parent;
	    this.node = node;
	    this.costSoFar = costSoFar;
	    this.simpleDistanceToTarget = simpleDistanceToTarget;
	    this.bestGuessDistance = function () {
	        return this.costSoFar + this.simpleDistanceToTarget;
	    };
	};

	var Node = function (side, x, y, localX, localY) {
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

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// NameSpace
	var EasyStar = EasyStar || {};

	// For require.js
	if (true) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
			return EasyStar;
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}

	// For browserify and node.js
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = EasyStar;
	}
	/**
	* A simple Node that represents a single tile on the grid.
	* @param {Object} parent The parent node.
	* @param {Number} x The x position on the grid.
	* @param {Number} y The y position on the grid.
	* @param {Number} costSoFar How far this node is in moves*cost from the start.
	* @param {Number} simpleDistanceToTarget Manhatten distance to the end point.
	**/
	EasyStar.Node = function (parent, x, y, costSoFar, simpleDistanceToTarget) {
		this.parent = parent;
		this.x = x;
		this.y = y;
		this.costSoFar = costSoFar;
		this.simpleDistanceToTarget = simpleDistanceToTarget;

		/**
	 * @return {Number} Best guess distance of a cost using this node.
	 **/
		this.bestGuessDistance = function () {
			return this.costSoFar + this.simpleDistanceToTarget;
		};
	};

	// Constants
	EasyStar.Node.OPEN_LIST = 0;
	EasyStar.Node.CLOSED_LIST = 1;
	/**
	* This is an improved Priority Queue data type implementation that can be used to sort any object type.
	* It uses a technique called a binary heap.
	* 
	* For more on binary heaps see: http://en.wikipedia.org/wiki/Binary_heap
	* 
	* @param {String} criteria The criteria by which to sort the objects. 
	* This should be a property of the objects you're sorting.
	* 
	* @param {Number} heapType either PriorityQueue.MAX_HEAP or PriorityQueue.MIN_HEAP.
	**/
	EasyStar.PriorityQueue = function (criteria, heapType) {
		this.length = 0; //The current length of heap.
		var queue = [];
		var isMax = false;

		//Constructor
		if (heapType == EasyStar.PriorityQueue.MAX_HEAP) {
			isMax = true;
		} else if (heapType == EasyStar.PriorityQueue.MIN_HEAP) {
			isMax = false;
		} else {
			throw heapType + " not supported.";
		}

		/**
	 * Inserts the value into the heap and sorts it.
	 * 
	 * @param value The object to insert into the heap.
	 **/
		this.insert = function (value) {
			if (!value.hasOwnProperty(criteria)) {
				throw "Cannot insert " + value + " because it does not have a property by the name of " + criteria + ".";
			}
			queue.push(value);
			this.length++;
			bubbleUp(this.length - 1);
		};

		/**
	 * Peeks at the highest priority element.
	 *
	 * @return the highest priority element
	 **/
		this.getHighestPriorityElement = function () {
			return queue[0];
		};

		/**
	 * Removes and returns the highest priority element from the queue.
	 *
	 * @return the highest priority element
	 **/
		this.shiftHighestPriorityElement = function () {
			if (this.length === 0) {
				throw "There are no more elements in your priority queue.";
			} else if (this.length === 1) {
				var onlyValue = queue[0];
				queue = [];
				this.length = 0;
				return onlyValue;
			}
			var oldRoot = queue[0];
			var newRoot = queue.pop();
			this.length--;
			queue[0] = newRoot;
			swapUntilQueueIsCorrect(0);
			return oldRoot;
		};

		var bubbleUp = function (index) {
			if (index === 0) {
				return;
			}
			var parent = getParentOf(index);
			if (evaluate(index, parent)) {
				swap(index, parent);
				bubbleUp(parent);
			} else {
				return;
			}
		};

		var swapUntilQueueIsCorrect = function (value) {
			var left = getLeftOf(value);
			var right = getRightOf(value);
			if (evaluate(left, value)) {
				swap(value, left);
				swapUntilQueueIsCorrect(left);
			} else if (evaluate(right, value)) {
				swap(value, right);
				swapUntilQueueIsCorrect(right);
			} else if (value == 0) {
				return;
			} else {
				swapUntilQueueIsCorrect(0);
			}
		};

		var swap = function (self, target) {
			var placeHolder = queue[self];
			queue[self] = queue[target];
			queue[target] = placeHolder;
		};

		var evaluate = function (self, target) {
			if (queue[target] === undefined || queue[self] === undefined) {
				return false;
			}

			var selfValue;
			var targetValue;

			// Check if the criteria should be the result of a function call.
			if (typeof queue[self][criteria] === 'function') {
				selfValue = queue[self][criteria]();
				targetValue = queue[target][criteria]();
			} else {
				selfValue = queue[self][criteria];
				targetValue = queue[target][criteria];
			}

			if (isMax) {
				if (selfValue > targetValue) {
					return true;
				} else {
					return false;
				}
			} else {
				if (selfValue < targetValue) {
					return true;
				} else {
					return false;
				}
			}
		};

		var getParentOf = function (index) {
			return Math.floor((index - 1) / 2);
		};

		var getLeftOf = function (index) {
			return index * 2 + 1;
		};

		var getRightOf = function (index) {
			return index * 2 + 2;
		};
	};

	// Constants
	EasyStar.PriorityQueue.MAX_HEAP = 0;
	EasyStar.PriorityQueue.MIN_HEAP = 1;

	/**
	 * Represents a single instance of EasyStar.
	 * A path that is in the queue to eventually be found.
	 */
	EasyStar.instance = function () {
		this.isDoneCalculating = true;
		this.pointsToAvoid = {};
		this.startX;
		this.callback;
		this.startY;
		this.endX;
		this.endY;
		this.nodeHash = {};
		this.openList;
	};
	/**
	*	EasyStar.js
	*	github.com/prettymuchbryce/EasyStarJS
	*	Licensed under the MIT license.
	* 
	*	Implementation By Bryce Neal (@prettymuchbryce)
	**/
	EasyStar.js = function () {
		var STRAIGHT_COST = 1.0;
		var DIAGONAL_COST = 1.4;
		var syncEnabled = false;
		var pointsToAvoid = {};
		var collisionGrid;
		var costMap = {};
		var pointsToCost = {};
		var allowCornerCutting = true;
		var iterationsSoFar;
		var instances = [];
		var iterationsPerCalculation = Number.MAX_VALUE;
		var acceptableTiles;
		var diagonalsEnabled = false;

		/**
	 * Sets the collision grid that EasyStar uses.
	 * 
	 * @param {Array|Number} tiles An array of numbers that represent 
	 * which tiles in your grid should be considered
	 * acceptable, or "walkable".
	 **/
		this.setAcceptableTiles = function (tiles) {
			if (tiles instanceof Array) {
				// Array
				acceptableTiles = tiles;
			} else if (!isNaN(parseFloat(tiles)) && isFinite(tiles)) {
				// Number
				acceptableTiles = [tiles];
			}
		};

		/**
	 * Enables sync mode for this EasyStar instance..
	 * if you're into that sort of thing.
	 **/
		this.enableSync = function () {
			syncEnabled = true;
		};

		/**
	 * Disables sync mode for this EasyStar instance.
	 **/
		this.disableSync = function () {
			syncEnabled = false;
		};

		/**
	  * Enable diagonal pathfinding.
	  */
		this.enableDiagonals = function () {
			diagonalsEnabled = true;
		};

		/**
	  * Disable diagonal pathfinding.
	  */
		this.disableDiagonals = function () {
			diagonalsEnabled = false;
		};

		/**
	 * Sets the collision grid that EasyStar uses.
	 * 
	 * @param {Array} grid The collision grid that this EasyStar instance will read from. 
	 * This should be a 2D Array of Numbers.
	 **/
		this.setGrid = function (grid) {
			collisionGrid = grid;

			//Setup cost map
			for (var y = 0; y < collisionGrid.length; y++) {
				for (var x = 0; x < collisionGrid[0].length; x++) {
					if (!costMap[collisionGrid[y][x]]) {
						costMap[collisionGrid[y][x]] = 1;
					}
				}
			}
		};

		/**
	 * Sets the tile cost for a particular tile type.
	 *
	 * @param {Number} The tile type to set the cost for.
	 * @param {Number} The multiplicative cost associated with the given tile.
	 **/
		this.setTileCost = function (tileType, cost) {
			costMap[tileType] = cost;
		};

		/**
	 * Sets the an additional cost for a particular point.
	 * Overrides the cost from setTileCost.
	 *
	 * @param {Number} x The x value of the point to cost.
	 * @param {Number} y The y value of the point to cost.
	 * @param {Number} The multiplicative cost associated with the given point.
	 **/
		this.setAdditionalPointCost = function (x, y, cost) {
			pointsToCost[x + '_' + y] = cost;
		};

		/**
	 * Remove the additional cost for a particular point.
	 *
	 * @param {Number} x The x value of the point to stop costing.
	 * @param {Number} y The y value of the point to stop costing.
	 **/
		this.removeAdditionalPointCost = function (x, y) {
			delete pointsToCost[x + '_' + y];
		};

		/**
	 * Remove all additional point costs.
	 **/
		this.removeAllAdditionalPointCosts = function () {
			pointsToCost = {};
		};

		/**
	 * Sets the number of search iterations per calculation. 
	 * A lower number provides a slower result, but more practical if you 
	 * have a large tile-map and don't want to block your thread while
	 * finding a path.
	 * 
	 * @param {Number} iterations The number of searches to prefrom per calculate() call.
	 **/
		this.setIterationsPerCalculation = function (iterations) {
			iterationsPerCalculation = iterations;
		};

		/**
	 * Avoid a particular point on the grid, 
	 * regardless of whether or not it is an acceptable tile.
	 *
	 * @param {Number} x The x value of the point to avoid.
	 * @param {Number} y The y value of the point to avoid.
	 **/
		this.avoidAdditionalPoint = function (x, y) {
			pointsToAvoid[x + "_" + y] = 1;
		};

		/**
	 * Stop avoiding a particular point on the grid.
	 *
	 * @param {Number} x The x value of the point to stop avoiding.
	 * @param {Number} y The y value of the point to stop avoiding.
	 **/
		this.stopAvoidingAdditionalPoint = function (x, y) {
			delete pointsToAvoid[x + "_" + y];
		};

		/**
	 * Enables corner cutting in diagonal movement.
	 **/
		this.enableCornerCutting = function () {
			allowCornerCutting = true;
		};

		/**
	 * Disables corner cutting in diagonal movement.
	 **/
		this.disableCornerCutting = function () {
			allowCornerCutting = false;
		};

		/**
	 * Stop avoiding all additional points on the grid.
	 **/
		this.stopAvoidingAllAdditionalPoints = function () {
			pointsToAvoid = {};
		};

		/**
	 * Find a path.
	 * 
	 * @param {Number} startX The X position of the starting point.
	 * @param {Number} startY The Y position of the starting point.
	 * @param {Number} endX The X position of the ending point.
	 * @param {Number} endY The Y position of the ending point.
	 * @param {Function} callback A function that is called when your path
	 * is found, or no path is found.
	 * 
	 **/
		this.findPath = function (startX, startY, endX, endY, callback) {
			// Wraps the callback for sync vs async logic
			var callbackWrapper = function (result) {
				if (syncEnabled) {
					callback(result);
				} else {
					setTimeout(function () {
						callback(result);
					});
				}
			};

			// No acceptable tiles were set
			if (acceptableTiles === undefined) {
				throw new Error("You can't set a path without first calling setAcceptableTiles() on EasyStar.");
			}
			// No grid was set
			if (collisionGrid === undefined) {
				throw new Error("You can't set a path without first calling setGrid() on EasyStar.");
			}

			// Start or endpoint outside of scope.
			if (startX < 0 || startY < 0 || endX < 0 || endX < 0 || startX > collisionGrid[0].length - 1 || startY > collisionGrid.length - 1 || endX > collisionGrid[0].length - 1 || endY > collisionGrid.length - 1) {
				throw new Error("Your start or end point is outside the scope of your grid.");
			}

			// Start and end are the same tile.
			if (startX === endX && startY === endY) {
				callbackWrapper([]);
				return;
			}

			// End point is not an acceptable tile.
			var endTile = collisionGrid[endY][endX];
			var isAcceptable = false;
			for (var i = 0; i < acceptableTiles.length; i++) {
				if (endTile === acceptableTiles[i]) {
					isAcceptable = true;
					break;
				}
			}

			if (isAcceptable === false) {
				callbackWrapper(null);
				return;
			}

			// Create the instance
			var instance = new EasyStar.instance();
			instance.openList = new EasyStar.PriorityQueue("bestGuessDistance", EasyStar.PriorityQueue.MIN_HEAP);
			instance.isDoneCalculating = false;
			instance.nodeHash = {};
			instance.startX = startX;
			instance.startY = startY;
			instance.endX = endX;
			instance.endY = endY;
			instance.callback = callbackWrapper;

			instance.openList.insert(coordinateToNode(instance, instance.startX, instance.startY, null, STRAIGHT_COST));

			instances.push(instance);
		};

		/**
	 * This method steps through the A* Algorithm in an attempt to
	 * find your path(s). It will search 4-8 tiles (depending on diagonals) for every calculation.
	 * You can change the number of calculations done in a call by using
	 * easystar.setIteratonsPerCalculation().
	 **/
		this.calculate = function () {
			if (instances.length === 0 || collisionGrid === undefined || acceptableTiles === undefined) {
				return;
			}
			for (iterationsSoFar = 0; iterationsSoFar < iterationsPerCalculation; iterationsSoFar++) {
				if (instances.length === 0) {
					return;
				}

				if (syncEnabled) {
					// If this is a sync instance, we want to make sure that it calculates synchronously.
					iterationsSoFar = 0;
				}

				// Couldn't find a path.
				if (instances[0].openList.length === 0) {
					var ic = instances[0];
					ic.callback(null);
					instances.shift();
					continue;
				}

				var searchNode = instances[0].openList.shiftHighestPriorityElement();

				var tilesToSearch = [];
				searchNode.list = EasyStar.Node.CLOSED_LIST;

				if (searchNode.y > 0) {
					tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
						x: 0, y: -1, cost: STRAIGHT_COST * getTileCost(searchNode.x, searchNode.y - 1) });
				}
				if (searchNode.x < collisionGrid[0].length - 1) {
					tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
						x: 1, y: 0, cost: STRAIGHT_COST * getTileCost(searchNode.x + 1, searchNode.y) });
				}
				if (searchNode.y < collisionGrid.length - 1) {
					tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
						x: 0, y: 1, cost: STRAIGHT_COST * getTileCost(searchNode.x, searchNode.y + 1) });
				}
				if (searchNode.x > 0) {
					tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
						x: -1, y: 0, cost: STRAIGHT_COST * getTileCost(searchNode.x - 1, searchNode.y) });
				}
				if (diagonalsEnabled) {
					if (searchNode.x > 0 && searchNode.y > 0) {

						if (allowCornerCutting || isTileWalkable(collisionGrid, acceptableTiles, searchNode.x, searchNode.y - 1) && isTileWalkable(collisionGrid, acceptableTiles, searchNode.x - 1, searchNode.y)) {

							tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
								x: -1, y: -1, cost: DIAGONAL_COST * getTileCost(searchNode.x - 1, searchNode.y - 1) });
						}
					}
					if (searchNode.x < collisionGrid[0].length - 1 && searchNode.y < collisionGrid.length - 1) {

						if (allowCornerCutting || isTileWalkable(collisionGrid, acceptableTiles, searchNode.x, searchNode.y + 1) && isTileWalkable(collisionGrid, acceptableTiles, searchNode.x + 1, searchNode.y)) {

							tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
								x: 1, y: 1, cost: DIAGONAL_COST * getTileCost(searchNode.x + 1, searchNode.y + 1) });
						}
					}
					if (searchNode.x < collisionGrid[0].length - 1 && searchNode.y > 0) {

						if (allowCornerCutting || isTileWalkable(collisionGrid, acceptableTiles, searchNode.x, searchNode.y - 1) && isTileWalkable(collisionGrid, acceptableTiles, searchNode.x + 1, searchNode.y)) {

							tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
								x: 1, y: -1, cost: DIAGONAL_COST * getTileCost(searchNode.x + 1, searchNode.y - 1) });
						}
					}
					if (searchNode.x > 0 && searchNode.y < collisionGrid.length - 1) {

						if (allowCornerCutting || isTileWalkable(collisionGrid, acceptableTiles, searchNode.x, searchNode.y + 1) && isTileWalkable(collisionGrid, acceptableTiles, searchNode.x - 1, searchNode.y)) {

							tilesToSearch.push({ instance: instances[0], searchNode: searchNode,
								x: -1, y: 1, cost: DIAGONAL_COST * getTileCost(searchNode.x - 1, searchNode.y + 1) });
						}
					}
				}

				// First sort all of the potential nodes we could search by their cost + heuristic distance.
				tilesToSearch.sort(function (a, b) {
					var aCost = a.cost + getDistance(searchNode.x + a.x, searchNode.y + a.y, instances[0].endX, instances[0].endY);
					var bCost = b.cost + getDistance(searchNode.x + b.x, searchNode.y + b.y, instances[0].endX, instances[0].endY);
					if (aCost < bCost) {
						return -1;
					} else if (aCost === bCost) {
						return 0;
					} else {
						return 1;
					}
				});

				var isDoneCalculating = false;

				// Search all of the surrounding nodes
				for (var i = 0; i < tilesToSearch.length; i++) {
					checkAdjacentNode(tilesToSearch[i].instance, tilesToSearch[i].searchNode, tilesToSearch[i].x, tilesToSearch[i].y, tilesToSearch[i].cost);
					if (tilesToSearch[i].instance.isDoneCalculating === true) {
						isDoneCalculating = true;
						break;
					}
				}

				if (isDoneCalculating) {
					instances.shift();
					continue;
				}
			}
		};

		// Private methods follow
		var checkAdjacentNode = function (instance, searchNode, x, y, cost) {
			var adjacentCoordinateX = searchNode.x + x;
			var adjacentCoordinateY = searchNode.y + y;

			if (pointsToAvoid[adjacentCoordinateX + "_" + adjacentCoordinateY] === undefined) {
				// Handles the case where we have found the destination
				if (instance.endX === adjacentCoordinateX && instance.endY === adjacentCoordinateY) {
					instance.isDoneCalculating = true;
					var path = [];
					var pathLen = 0;
					path[pathLen] = { x: adjacentCoordinateX, y: adjacentCoordinateY };
					pathLen++;
					path[pathLen] = { x: searchNode.x, y: searchNode.y };
					pathLen++;
					var parent = searchNode.parent;
					while (parent != null) {
						path[pathLen] = { x: parent.x, y: parent.y };
						pathLen++;
						parent = parent.parent;
					}
					path.reverse();
					var ic = instance;
					var ip = path;
					ic.callback(ip);
					return;
				}

				if (isTileWalkable(collisionGrid, acceptableTiles, adjacentCoordinateX, adjacentCoordinateY)) {
					var node = coordinateToNode(instance, adjacentCoordinateX, adjacentCoordinateY, searchNode, cost);

					if (node.list === undefined) {
						node.list = EasyStar.Node.OPEN_LIST;
						instance.openList.insert(node);
					} else if (node.list === EasyStar.Node.OPEN_LIST) {
						if (searchNode.costSoFar + cost < node.costSoFar) {
							node.costSoFar = searchNode.costSoFar + cost;
							node.parent = searchNode;
						}
					}
				}
			}
		};

		// Helpers
		var isTileWalkable = function (collisionGrid, acceptableTiles, x, y) {
			for (var i = 0; i < acceptableTiles.length; i++) {
				if (collisionGrid[y][x] === acceptableTiles[i]) {
					return true;
				}
			}

			return false;
		};

		var getTileCost = function (x, y) {
			return pointsToCost[x + '_' + y] || costMap[collisionGrid[y][x]];
		};

		var coordinateToNode = function (instance, x, y, parent, cost) {
			if (instance.nodeHash[x + "_" + y] !== undefined) {
				return instance.nodeHash[x + "_" + y];
			}
			var simpleDistanceToTarget = getDistance(x, y, instance.endX, instance.endY);
			if (parent !== null) {
				var costSoFar = parent.costSoFar + cost;
			} else {
				costSoFar = simpleDistanceToTarget;
			}
			var node = new EasyStar.Node(parent, x, y, costSoFar, simpleDistanceToTarget);
			instance.nodeHash[x + "_" + y] = node;
			return node;
		};

		var getDistance = function (x1, y1, x2, y2) {
			return Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2);
		};
	};

/***/ }
/******/ ]);