import js from "@eslint/js";
import tseslint from "typescript-eslint";

const eslintConfig = [js.configs.recommended, ...tseslint.configs.recommended];

export default eslintConfig;
