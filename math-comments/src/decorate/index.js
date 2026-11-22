// Decorate package: editor decorations for rendered math, the hover, and the style they share.
const { Controller } = require("./controller");
const { hoverProvider } = require("./hover");
const { currentStyle } = require("./style");

module.exports = { Controller, hoverProvider, currentStyle };
