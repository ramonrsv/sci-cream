import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import jsdoc from "eslint-plugin-jsdoc";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
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
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"] },
];

export default eslintConfig;
