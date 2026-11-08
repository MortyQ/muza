import {baseConfig} from "@muzakit/config/eslint.base.mjs";

export default [
    {
        // Vendored skills are third-party code pinned by hash in skills-lock.json;
        // lint-staged's `eslint --fix` would rewrite them on commit.
        ignores: [".agents/**"],
    },
    ...baseConfig,
    {
        // Specs define throwaway host components inline — a router stub, a
        // wrapper that gives a component a real v-model. One file per component
        // is a rule about the library, not about the harness that exercises it.
        files: ["libs/*/tests/**/*.ts"],
        rules: {
            "vue/one-component-per-file": "off",
        },
    },
];
