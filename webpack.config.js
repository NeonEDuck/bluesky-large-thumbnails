import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';

const outputPath = 'build';
const entryPoints = {
    content: path.resolve(import.meta.dirname, 'src', 'content.ts')
};

const config = {
    entry: entryPoints,
    output: {
        path: path.join(import.meta.dirname, outputPath, 'debug'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(jpg|jpeg|png|gif|woff|woff2|eot|ttf|svg)$/i,
                use: 'url-loader?limit=1024'
            }
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                'manifest.json',
                'icon{0..128}.png',
            ]
        })
    ],
}

export default (env, argv) => {
    config.mode = argv.mode
    if (config.mode === 'development') {
        config.devtool = 'inline-source-map';
        config.output.path = path.join(import.meta.dirname, outputPath, 'debug');
    }
    if (config.mode === 'production') {
        config.output.path = path.join(import.meta.dirname, outputPath, 'release');
    }

    return config
};