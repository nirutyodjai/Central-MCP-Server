const globals = require("globals");
const pluginJs = require("@eslint/js");
const pluginJest = require("eslint-plugin-jest");

module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    ...pluginJs.configs.recommended,
  },
  {
    files: ["test/**/*.js"],
    ...pluginJest.configs["flat/recommended"],
    rules: {
      ...pluginJest.configs["flat/recommended"].rules,
    },
  },
];
