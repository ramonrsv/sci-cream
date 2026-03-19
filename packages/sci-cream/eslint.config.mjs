import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsdoc from "eslint-plugin-jsdoc";

const eslintConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs["flat/recommended-typescript-error"],
  {
    rules: {
      "jsdoc/require-jsdoc": [
        "warn",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ClassExpression: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: ['ExportNamedDeclaration:has(VariableDeclaration[kind="const"])'],
          enableFixer: false,
        },
      ],
      "jsdoc/require-returns": "off",
      "jsdoc/require-param": "off",
      "jsdoc/tag-lines": ["warn", "any", { startLines: 1 }],
    },
  },
];

export default eslintConfig;
