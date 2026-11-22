// Views root: the session tree, the Claude Sessions panels, the Projects view and the Home tab.
const { SessionTree } = require("./tree");
const { SessionsView } = require("./sessions");
const { ProjectsView } = require("./projects");
const { HomePanel } = require("./home");

module.exports = { SessionTree, SessionsView, ProjectsView, HomePanel };
