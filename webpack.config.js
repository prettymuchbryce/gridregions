module.exports = {
    entry: './client/src/app.js',
    output: {
        path: './static',
        filename: 'js/all.js'
    },
    module: {
        loaders: [
            { test: /\.jsx?$/, loader: 'babel-loader' },
            { test: /\.less$/, loader: 'style-loader!css-loader!less-loader' },
            { test: /\.css$/, loader: 'style-loader!css-loader' },
            // inline base64 URLs for <=8k images, direct URLs for the rest
            { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192'}
        ]
    },
    resolve: {
        extensions: ['', '.js', '.json', '.jsx']
    }
};