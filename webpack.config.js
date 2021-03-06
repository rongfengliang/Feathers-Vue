require('colors')
const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const ExtractTextPlugin = require("extract-text-webpack-plugin")
const AsyncAwaitPlugin = require('webpack-async-await')
const TapWebpackPlugin = require('tap-webpack-plugin')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')
const nodeExternals = require('webpack-node-externals')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const WebpackCleanupPlugin = require('webpack-cleanup-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CompressionWebpackPlugin = require('compression-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const configs = []

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const node = /node_modules/

const folders = {
  root: path.resolve(__dirname),
  node_modules: path.resolve(__dirname, 'node_modules'),
  public: path.resolve(__dirname, 'public'),
  server: path.resolve(__dirname, 'server'),
  app: path.resolve(__dirname, 'app'),
  images: path.resolve(__dirname, 'app', 'images'),
  boot: path.resolve(__dirname, 'app', 'boot'),
}

const base = {
  module : {
    loaders : [
      {
        test: /\.pug/,
        loaders: ["string-loader", "pug-html-loader"],
        exclude: node,
        include: [
          folders.app
        ]
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: node
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        exclude: node,
        include: [
          folders.app
        ],
        options: {
          loaders: {
            css: ExtractTextPlugin.extract({
              fallback: 'vue-style-loader',
              use: 'css-loader'
            }),
            styl: ExtractTextPlugin.extract({
              fallback: 'vue-style-loader',
              use: 'css-loader!stylus-loader'
            }),
            stylus: ExtractTextPlugin.extract({
              fallback: 'vue-style-loader',
              use: 'css-loader!stylus-loader'
            }),
            html: 'pug'
          }
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract({
          use: 'css-loader!sass-loader'
        }),
        include: [
          folders.app
        ]
      },
      {
        test: /\.styl$/,
        loader: ExtractTextPlugin.extract({
          use: 'css-loader!stylus-loader'
        }),
        exclude: node,
        include: [
          folders.app
        ]
      },
      {
        test: /\.svg$/,
        loader: 'raw-loader'
      },
      {
        test: /\.(png|jpe?g|gif)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'img/[name].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'fonts/[name].[ext]'
        }
      }
    ]
  },

  // Dev plugins

  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new AsyncAwaitPlugin({
      awaitAnywhere:true,
      asyncExits:true
    }),
    new ExtractTextPlugin({
      filename: '[name].css'
    }),
    new ProgressBarPlugin({
      format: ' [:bar] ' + ':percent'.bold + ' (:msg)'
    }),
    new FriendlyErrorsPlugin({
      clearConsole: true
    }),
    new CopyWebpackPlugin([
      {
        from: folders.images,
        to: path.join(folders.public, 'images')
      }
    ]),
    new CopyWebpackPlugin([
      {
        from: path.join(folders.app, 'favicon.ico'),
        to: folders.public
      }
    ]),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    })

  // Production plugins

  ].concat(isProduction ? [

    new OptimizeCSSPlugin({
      cssProcessorOptions: {
        safe: true
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: false,
      minimize: true,
      compress: {
        warnings: false
      }
    }),
    new CompressionWebpackPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: /\.(js|css)$/,
      threshold: 10240,
      minRatio: 0.8
    })
  ] : []),
  performance: {
    hints: false
  }
}

configs[0] = merge({}, base, {
  entry: folders.boot,
  output: {
    path: folders.public,
    publicPath: '/public/',
    filename: '[name].js',
    chunkFilename: '[id].js',
    sourceMapFilename: "[file].map"
  },
  externals: isTest ? nodeExternals(): undefined,
  devtool: isProduction ? false : isTest ? "inline-cheap-module-source-map" : "cheap-source-map",
  resolve: {
    modules: ['node_modules'],
    mainFields: ['browser', 'main'],
    alias: {
      vue: 'vue/dist/vue.js',
      '@app': path.resolve(__dirname, 'app')
    }
  },
  plugins: base.plugins.concat([
    new WebpackCleanupPlugin({
      exclude: [
        "index.html",
        "file-size-report.html",
        "vue-ssr-server-bundle.json", 
        "favicon.ico",
        "images/**/*",
        "fonts/**/*"
      ],
    }),
    new VueSSRClientPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      minify: {
        removeAttributeQuotes: false,
        removeComments: true,
        collapseWhitespace: true
      },
      template: path.resolve(folders.app, 'index.template.html'),
      inject: true
    }),
    new BundleAnalyzerPlugin({
      reportFilename: 'file-size-report.html'
    })
  ]).concat(!isProduction ? [] : [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      chunks: ['vendor']
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: function (module, count) {
        // any required modules inside node_modules are extracted to vendor
        return (
          module.resource &&
          /\.js$/.test(module.resource) &&
          (
            module.resource.indexOf(
              path.join(__dirname, 'node_modules')
            ) === 0
          )
        )
      }
    }),
  ])
})

configs[1] = merge({}, base, {
  target: 'node',
  entry: {
    app: path.resolve(folders.app, 'server-entry.js')
  },
  externals: nodeExternals({
    whitelist: /(\.css$|\.less$|\.sass$|\.scss$|\.styl$|\.stylus$|\.(png|jpe?g|gif|svg)(\?.*)?$|\.(woff2?|eot|ttf|otf)(\?.*)?$)/
  }),
  output: {
    libraryTarget: 'commonjs2',
    path: folders.public,
    filename: '[name].js'
  },
  devtool: isProduction ? false : isTest ? "inline-cheap-module-source-map" : "cheap-source-map",
  plugins: base.plugins.concat([
    new VueSSRServerPlugin()
  ])
})

module.exports = isTest? configs[0] : configs
