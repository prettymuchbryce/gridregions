## GridRegions

### What is GridRegions ?

GridRegions is a helper library based heavily on HPA* for tile-based game development.

Given collision information, GridRegions can quickly find paths connecting points on a grid.

GridRegions can also help quickly find "entity" data near a particular point. One practical example might be when building an RTS game, how does a worker quickly find a nearby tree to chop down ?

This is accomplished by breaking the search space up into "regions" (default 10x10), and precomputing path information within and between regions ahead of the search.

### Why not use a traditional pathfinding algorithm alone (like A*) ?

GridRegions is faster than A* in very large search spaces. This is due to the way GridRegions precomputes the relationships between regions.

Additionally, we use this pre-computed information to quickly find nearby game information in the grid which we refer to as "entities". With traditional A* we may have a list of all entities we are interested in, and compute paths to the them in order to find the closest (shortest path). This becomes more computationally expensive as the number of entities grows. With GridRegions, we can simply perform a BFS on the abstract graph, and return the first entity that we find during the search. 

### Usage

`gridregions-min.js`, and `gridregions.js` are located in the bin directory


### API

```
/**
* GridRegions constructor.
*
* @param {number} gridSize - The width and height of the grid. Must be divisible by regionSize.
* @param {Object} options - An object containing options.
* @param {number} options.regionSize - The size of individual regions. Defaults to 10.
**/

var instance = GridRegions(gridSize, options);
```

```
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

instance.addEntity(entity, options, x, y);
```

```
/**
* Moves an existing entity on the board.
*
* @param {number} id - The unique ID of the entity.
* @param {number} newX - The X position to move the entity to.
* @param {number} newY - The Y position to move the entity to.
**/

instance.moveEntity(id, newX, newY);
```

```
/**
* Removes an entity from the board
*
* @param {number} id - The ID of the entity to remove.
**/

instance.removeEntity(id);
```

```
/**
* Returns the internal representation of the entity.
*
* @param {number} id - The ID of the entity to get.
*
* @param {Object} The entity, or undefined if it does not exist.
**/

instance.getEntity(id);
```

```
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

instance.getNearbyEntity(x, y, query);
```

```
/**
* Sets a tile as "impassable" or "collidable".
*
* @param {number} x - The X position of the tile to make impassable.
* @param {number} y - The Y Position of the tile to make impassable.
**/

instance.setImpassableTile(x, y);
```

```
/**
* Sets a tile as "passable" 
*
* @param {number} x - The X position of the tile to make passable.
* @param {number} y - The Y Position of the tile to make passable.
**/

instance.unsetImpassableTile(x, y);
```

```
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

instance.getFullPath(startX, startY, endX, endY, smoothing);
```

```
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

instance.getAbstractPath(startX, startY, endX, endY);
```

### Development

GridRegions is in Alpha. There are probably bugs. Test coverage needs to be extended, and benchmarks need to be written. An interactive demo would probably be helpful in explaining the concept.

__Running Tests__
```make test```

__Building__
```make build```

### License

MIT

### References

[Near Optimal Hierarchical Path-Finding - A. Botea, M. Müller, J. Schaeffer](https://webdocs.cs.ualberta.ca/~mmueller/ps/hpastar.pdf)

[Region System - Rimworld](https://www.youtube.com/watch?v=RMBQn_sg7DA)