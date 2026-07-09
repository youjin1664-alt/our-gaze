import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // React Three Fiber's core pattern is mutating Three.js objects (camera,
    // scene, refs) inside useFrame every render tick — that's the intended
    // "escape hatch" from React's render cycle, not a bug. The React
    // Compiler's immutability rule doesn't know about this convention and
    // flags it as unsafe, so it's disabled for components that drive R3F's
    // render loop.
    files: ["components/CameraRig.tsx", "components/CursorPusher.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
