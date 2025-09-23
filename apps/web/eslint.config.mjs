import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly"
      }
    },
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-duplicate-imports": "error",
      "no-useless-return": "error",
      "no-loop-func": "error",
      "no-new-object": "error",
      "no-new-wrappers": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error"
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly"
      }
    },
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": "off", // Disable for TypeScript files
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-duplicate-imports": "error",
      "no-useless-return": "error",
      "no-loop-func": "error",
      "no-new-object": "error",
      "no-new-wrappers": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error"
    }
  },
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs"
    ]
  }
];
