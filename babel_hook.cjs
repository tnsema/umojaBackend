require("@babel/register")({
  extensions: [".js"],
  ignore: [/node_modules/],
  // your babel config...
});

// Use dynamic import instead of require
import("./server.js");
