## GridRegions

### What is GridRegions ?

GridRegions is a helper library based heavily on HPA* for grid-based game development which quickly. GridRegions finds suitable paths between points. In addition, GridRegions can also help quickly find entities near a particular point. This is accomplished by breaking the search space up into "regions" (default 10x10), and precomputes path information within and between regions ahead of time.

### Why not use a traditional pathfinding algorithm like A* ?

GridRegions is faster than A* in very large search spaces. This is due to the way GridRegions precomputes the relationships between regions.

Additionally, we use this pre-computed information to quickly find nearby game information in the grid which we refer to as "entities". With traditional A* we may have a list of all entities we are interested in, and compute paths to the target in order to find the closest. This is very expensive as the number of entities grows. With GridRegions, we can simply perform a BFS on the abstract graph, and return the first entity that we find during the search.

### Usage

`gridregions-min.js`, and `gridregions.js` are located in the bin directory

### API

// TODO

### Development

GridRegions is in Alpha. There are probably bugs. Test coverage needs to be extended, and benchmarks need to be written. An interactive demo would probably be helpful in explaining the concept.

__Running Tests___
`make test`

__Building__
`make build`

### License

MIT

### References

[https://webdocs.cs.ualberta.ca/~mmueller/ps/hpastar.pdf](Near Optimal Hierarchical Path-Finding - A. Botea, M. Müller, J. Schaeffer)

[https://www.youtube.com/watch?v=RMBQn_sg7DA](Region System - Rimworld)