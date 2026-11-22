// Hover over any math in a comment: the formula rendered large, plus the TeX error when it fails.
const vscode = require("vscode");
const { renderImage } = require("../render");
const { currentStyle } = require("./style");

function hoverProvider(controller) {
  return {
    provideHover(document, position) {
      const style = currentStyle();
      if (!style.enabled) return null;
      const offset = document.offsetAt(position);
      const hit = controller.itemsFor(document).find((m) => m.start <= offset && offset <= m.end);
      if (!hit) return null;
      const md = new vscode.MarkdownString();
      md.supportHtml = true;
      const img = renderImage(hit.tex, true, { color: style.color, exPx: Math.round(style.exPx * style.hoverScale), maxHeight: 0 });
      if (img.error) {
        md.appendMarkdown("**Math Comments: TeX error**: ");
        md.appendText(img.error);
        md.appendCodeblock(hit.tex, "latex");
      } else {
        md.appendMarkdown(`<img src="${img.uri}" width="${img.width}" height="${img.height}"/>`);
      }
      const range = new vscode.Range(document.positionAt(hit.start), document.positionAt(hit.end));
      return new vscode.Hover(md, range);
    },
  };
}

module.exports = { hoverProvider };
