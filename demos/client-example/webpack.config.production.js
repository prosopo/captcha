
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const config = require('./webpack.config.base.js');

// plugin that exits the process once compilation is done
const donePlugin =   {
  apply: (compiler) => {
    compiler.hooks.done.tap('DonePlugin', (stats) => {
      console.log('Compile is done !')
      setTimeout(() => {
        process.exit(0)
      })
    })
  },
}

// plugins that are only used in production
const productionPlugins = [
  new MiniCssExtractPlugin(),
  donePlugin
]
const rules = config.module.rules
rules[2].use[0] = MiniCssExtractPlugin.loader

module.exports = {
  mode: 'production',
  plugins: config.plugins.concat(productionPlugins),
  rules: rules,
  ...config,
}
