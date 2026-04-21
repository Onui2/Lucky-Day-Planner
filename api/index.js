const apiModule = require("../artifacts/api-server/dist/vercel-app.cjs");

module.exports = apiModule.default ?? apiModule;
