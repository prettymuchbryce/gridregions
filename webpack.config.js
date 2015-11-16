var webpack = require('webpack');
var minify = process.argv.indexOf('--minify') === -1 ? false : true;
var demo = process.argv.indexOf('--demo') === -1 ? false : true;
var plugins = [];

if (minify) {
    plugins.push(new webpack.optimize.UglifyJsPlugin())
}

if (demo) {
    module.exports = {
        entry: './demo/src/js/demo.js',
        output: {
            path: './demo/static/js',
            filename: 'app.js'
        },
        module: {
            noParse: [ /.*(pixi\.js).*/ ],
            loaders: [
                { test: /\.jsx?$/, loader: 'babel-loader', exclude: /.config.js$/ },
                { test: /\.less$/, loader: 'style-loader!css-loader!less-loader' },
                { test: /\.css$/, loader: 'style-loader!css-loader' },
                // inline base64 URLs for <=8k images, direct URLs for the rest
                { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192' },
                { test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff' },
                { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/octet-stream' },
                { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file' },
                { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=image/svg+xml' },
            ]
        },
        resolve: {
            extensions: ['', '.js', '.json', '.jsx', '.css', '.less']
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
        extensions: ['', '.js']
    },
    plugins: plugins
}; 