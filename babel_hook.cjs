// babel_hook.cjs

require("@babel/register")({
  extensions: [".js", ".mjs"],
  ignore: [/node_modules/], // ⬅️ critical: do NOT compile node_modules
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
  ],
});

// After the register hook is in place, just require your app entry.
require("./server.js"); // or ./index.js or whatever your main file is
