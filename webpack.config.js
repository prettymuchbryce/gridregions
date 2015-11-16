var webpack = require('webpack');
var minify = process.argv.indexOf('--minify') === -1 ? false : true;
var demo = process.argv.indexOf('--demo') === -1 ? false : true;
var plugins = [];

if (minify) {
    plugins.push(new webpack.optimize.UglifyJsPlugin())
}

if (demo) {
    module.exports = {
        entry: './src/gridregions.js',
        output: {
            path: './demo',
            filename: 'app.js'
        }
        module: {
            loaders: [
                { test: /\.js$/, loader: 'babel-loader' },
            ]
        },
        resolve: {
            extensions: ['', '.js', '.json', '.jsx']
        },
        plugins: plugins
    };
    return;
}

module.exports = {
    entry: './src/gridregions.js',
    module: {
        loaders: [
            { test: /\.js$/, loader: 'babel-loader' },
        ]
    },
    resolve: {
        extensions: ['', '.js', '.json', '.jsx']
    },
    plugins: plugins
};