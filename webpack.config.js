const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    entry: "./src/app.ts",
    mode: "development",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: ['.tsx', '.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.(png|jpg|jpeg)$/i,
                type: "asset/resource",
            },
            {
                // Embed your WGSL files as strings
                test: /\.wgsl$/i,
                type: "asset/source",
            },
            {
                test: /\.css$/,
                use: [
                  'style-loader',
                  'css-loader'
                ]
              },
              {
                test: /\.js$/,
                exclude: ['/node_modules/']
            },
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                //exclude: /node_modules/,
              }
        ]
    },
    plugins: [new HtmlWebpackPlugin({
        template: "./index.html",
    })],
};
