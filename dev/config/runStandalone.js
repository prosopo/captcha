const AllowListPlugin = require('./allowListPlugin'); // adjust the path to the plugin file

let plugin = new AllowListPlugin();

let compiler = {
  hooks: {
    beforeCompile: {
      tapAsync(name, callback) {
        this._callback = callback;
      },
    },
  },
};

// Apply the plugin
plugin.apply(compiler);

// Call the callback to trigger the plugin's logic
compiler.hooks.beforeCompile._callback({}, () => {});
