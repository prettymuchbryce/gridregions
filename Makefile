.PHONY: all test demo

test:
	mocha

build:
	webpack --output-filename ./bin/gridregions.js
	webpack --output-filename ./bin/gridregions-min.js --minify
	webpack --demo

demo:
	node ./node_modules/http-server/bin/http-server ./demo/static

watch-demo:
	webpack --demo --watch --colors