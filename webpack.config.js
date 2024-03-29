const lodash = require('lodash');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const { IgnorePlugin } = require('webpack');
const { ExternalsPlugin } = require('webpack');
const { ContextReplacementPlugin } = require('webpack');

const optionalPlugins = [];
// For this:
// ```
// WARNING in ./node_modules/chokidar/lib/fsevents-handler.js 9:13-32
// Module not found: Error: Can't resolve 'fsevents' in 'node_modules\chokidar\lib'
// ```
if (process.platform !== "darwin") { // don't ignore on OSX
  optionalPlugins.push(new IgnorePlugin({ resourceRegExp: /^fsevents$/ }));
}

function srcPaths(src) {
  return path.join(__dirname, src);
}

const isEnvProduction = process.env.NODE_ENV === 'production';
const isEnvDevelopment = process.env.NODE_ENV === 'development';

// #region Common settings
const commonConfig = {
  devtool: isEnvDevelopment ? 'source-map' : false,
  mode: isEnvProduction ? 'production' : 'development',
  output: { path: srcPaths('dist') },
  node: { __dirname: false, __filename: false },
  resolve: {
    alias: {
      _: srcPaths('src'),
      _main: srcPaths('src/main'),
      _models: srcPaths('src/models'),
      _public: srcPaths('public'),
      _renderer: srcPaths('src/renderer'),
      _utils: srcPaths('src/utils'),
    },
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.(scss|css)$/,
        use: [
          'style-loader',
          "@teamsupercell/typings-for-css-modules-loader",
          {
            loader: "css-loader",
            options: { modules: true }
          }
        ],
      },
      {
        test: /\.(jpg|png|svg|ico|icns)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
        },
      },
    ],
  },
  plugins: [
    ...optionalPlugins,
    new ContextReplacementPlugin(/keyv/), // for 'got' packet
  ],
  stats: {
    errorDetails: true
  },
};
// #endregion

const mainConfig = lodash.cloneDeep(commonConfig);
mainConfig.entry = './src/main/main.ts';
mainConfig.target = 'electron-main';
mainConfig.output.filename = 'main.bundle.js';
mainConfig.plugins = [
  new CopyPlugin({
    patterns: [
      {
        from: 'package.json',
        to: 'package.json',
        transform: (content, _path) => { // eslint-disable-line no-unused-vars
          const jsonContent = JSON.parse(content);

          delete jsonContent.devDependencies;
          delete jsonContent.scripts;
          delete jsonContent.build;

          jsonContent.main = './main.bundle.js';
          jsonContent.scripts = { start: 'electron ./main.bundle.js' };
          jsonContent.postinstall = 'electron-builder install-app-deps';

          return JSON.stringify(jsonContent, undefined, 2);
        },
      },
    ],
  }),
  ...commonConfig.plugins,
];

const preloadConfig = lodash.cloneDeep(commonConfig);
preloadConfig.entry = './src/main/preload.ts';
preloadConfig.target = 'electron-preload';
preloadConfig.output.filename = 'preload.bundled.js';
preloadConfig.plugins = [
  ...commonConfig.plugins,
];

const rendererConfig = lodash.cloneDeep(commonConfig);
rendererConfig.entry = './src/renderer/renderer.tsx';
rendererConfig.target = 'electron-renderer';
rendererConfig.output.filename = 'renderer.bundle.js';
rendererConfig.plugins = [
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, './public/index.html'),
  }),
  new ExternalsPlugin('commonjs', [ 'desktop-capturer', 'electron', 'ipc', 'ipc-renderer', 'native-image', 'remote', 'web-frame', 'clipboard', 'crash-reporter', 'screen', 'shell' ]),
  ...commonConfig.plugins,
];

module.exports = [mainConfig, rendererConfig, preloadConfig];
