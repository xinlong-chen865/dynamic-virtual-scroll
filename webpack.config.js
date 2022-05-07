
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
    mode: 'none',
    entry: {
        'dynamic-virtual-scroll': './src/index.js',
        'dynamic-virtual-scroll.min': './src/index.js',
    },
    output : {
        filename: '[name].js',
        library: 'dynamic-virtual-scroll',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                include: /\.min\.js$/,
            })
        ]
    }
}