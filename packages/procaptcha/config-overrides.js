const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");
const webpack = require("webpack");
const path = require("path");

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
  config.cache = false;
  return config;
};
