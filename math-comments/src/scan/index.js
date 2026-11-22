// Scan package: finds the LaTeX math inside a document's comments.
// detectMath(text, languageId) -> [{ start, end, tex, display, block, line, endLine, anchor, hide }]
const { languageSpec } = require("./languages");
const { scanComments } = require("./lexer");
const { groupPieces } = require("./pieces");
const { findMath } = require("./math");

function detectMath(text, languageId) {
  const comments = scanComments(text, languageSpec(languageId));
  const { groups, starts } = groupPieces(text, comments);
  return findMath(text, groups, starts);
}

module.exports = { detectMath, scanComments, languageSpec, groupPieces, findMath };
