import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const [, , sourcePath, modulePath, patternSource] = process.argv;

if (!sourcePath || !modulePath || !patternSource) {
  console.error(
    "Uso: node scripts/extract-css-module.mjs <origen.css> <modulo.css> <regex>",
  );
  process.exit(1);
}

const matcher = new RegExp(patternSource);
const source = postcss.parse(fs.readFileSync(sourcePath, "utf8"), {
  from: sourcePath,
});
const extracted = postcss.root();
let movedRules = 0;
let movedSelectors = 0;

function splitContainer(sourceContainer, targetContainer) {
  for (const node of [...sourceContainer.nodes]) {
    if (node.type === "rule") {
      const selectors = node.selectors ?? [node.selector];
      const targetSelectors = selectors.filter((selector) => matcher.test(selector));
      const retainedSelectors = selectors.filter((selector) => !matcher.test(selector));

      if (targetSelectors.length === 0) {
        continue;
      }

      const clone = node.clone({ selectors: targetSelectors });
      targetContainer.append(clone);
      movedRules += 1;
      movedSelectors += targetSelectors.length;

      if (retainedSelectors.length > 0) {
        node.selectors = retainedSelectors;
      } else {
        node.remove();
      }
      continue;
    }

    if (node.type === "atrule" && node.nodes) {
      const targetAtRule = node.clone({ nodes: [] });
      splitContainer(node, targetAtRule);

      if (targetAtRule.nodes.length > 0) {
        targetContainer.append(targetAtRule);
      }

      if (node.nodes.length === 0) {
        node.remove();
      }
    }
  }
}

splitContainer(source, extracted);

const banner = postcss.comment({
  text: `Modulo extraido de ${path.basename(sourcePath)}. Mantener aqui sus selectores de dominio.`,
});
extracted.prepend(banner);

fs.writeFileSync(sourcePath, source.toString());
fs.writeFileSync(modulePath, `${extracted.toString()}\n`);

console.log(
  JSON.stringify(
    {
      sourcePath,
      modulePath,
      movedRules,
      movedSelectors,
    },
    null,
    2,
  ),
);
