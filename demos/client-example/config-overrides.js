const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = function override(config, env) {
  config.plugins = [
    ...config.plugins,
    new NodePolyfillPlugin(),
    new webpack.ContextReplacementPlugin(/mocha|typescript|redspot|express/),
    new webpack.IgnorePlugin({
      resourceRegExp: /ts-node|perf_hooks/
    })
  ];
  config.resolve = {
    ...config.resolve,
    fallback: {
      fs: require.resolve("browserify-fs"),
      repl: false,
      module: false,
      child_process: false,
      pnpapi: false,
      net: false,
      tls: false
    }
  };
  config.ignoreWarnings = [/Failed to parse source map/];
  config.resolve.plugins = config.resolve.plugins.filter(
    (plugin) => !(plugin instanceof ModuleScopePlugin)
  );

  config.module.rules =
    [
      {
        scheme: 'data',
        type: 'asset/resource',
      },
      {
        include: /node_modules/,
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          require.resolve('css-loader')
        ]
      },
      {
        exclude: /(node_modules)/,
        test: /\.(js|mjs|ts|tsx)$/,
        use: [
          require.resolve('thread-loader'),
          {
            loader: require.resolve('babel-loader'),
            options: require('@polkadot/dev/config/babel-config-webpack.cjs')
          }
        ]
      },
      {
        test: /\.md$/,
        use: [
          require.resolve('html-loader'),
          require.resolve('markdown-loader')
        ]
      },
      {
        test: /\.css$/i,
        use: [
          require.resolve('style-loader'),
          require.resolve('css-loader')
        ]
      },
      {
        exclude: [/semantic-ui-css/],
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
        type: 'asset/resource',
        generator: {
          filename: 'static/[name].[contenthash:8].[ext]'
        }
      },
      {
        exclude: [/semantic-ui-css/],
        test: [/\.eot$/, /\.ttf$/, /\.svg$/, /\.woff$/, /\.woff2$/],
        type: 'asset/resource',
        generator: {
          filename: 'static/[name].[contenthash:8].[ext]'
        }
      },
      {
        include: [/semantic-ui-css/],
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.eot$/, /\.ttf$/, /\.svg$/, /\.woff$/, /\.woff2$/],
        use: [
          {
            loader: require.resolve('null-loader')
          }
        ]
      }
    ]


  config.cache = false;
  return config;
};
