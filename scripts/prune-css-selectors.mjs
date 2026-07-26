import fs from "node:fs";
import postcss from "postcss";

const [, , file, ...classNames] = process.argv;

if (!file || classNames.length === 0) {
  console.error(
    "Uso: node scripts/prune-css-selectors.mjs <archivo.css> <clase> [...]",
  );
  process.exit(1);
}

const escapedClasses = classNames.map((className) =>
  className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);
const matcher = new RegExp(
  `\\.(${escapedClasses.join("|")})(?![_a-zA-Z0-9-])`,
);
const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
let removedSelectors = 0;
let removedRules = 0;

root.walkRules((rule) => {
  const selectors = rule.selectors ?? [rule.selector];
  const retained = selectors.filter((selector) => !matcher.test(selector));

  removedSelectors += selectors.length - retained.length;

  if (retained.length === 0) {
    rule.remove();
    removedRules += 1;
    return;
  }

  rule.selectors = retained;
});

root.walkAtRules((atRule) => {
  if (atRule.nodes && atRule.nodes.length === 0) {
    atRule.remove();
  }
});

fs.writeFileSync(file, root.toString().replace(/\n+$/, "\n"));
console.log(JSON.stringify({ file, removedRules, removedSelectors }));
