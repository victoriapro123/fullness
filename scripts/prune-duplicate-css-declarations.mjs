import fs from "node:fs";
import postcss from "postcss";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error(
    "Uso: node scripts/prune-duplicate-css-declarations.mjs <archivo.css> [...]",
  );
  process.exit(1);
}

function atRuleContext(node) {
  const context = [];
  let parent = node.parent;

  while (parent && parent.type !== "root") {
    if (parent.type === "atrule") {
      context.unshift(`@${parent.name} ${parent.params}`);
    }
    parent = parent.parent;
  }

  return context.join(" > ");
}

for (const file of files) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  const seen = new Set();
  let removed = 0;

  const declarations = [];
  root.walkDecls((declaration) => declarations.push(declaration));

  for (const declaration of declarations.reverse()) {
    const rule = declaration.parent;
    if (!rule || rule.type !== "rule") {
      continue;
    }

    const key = [
      atRuleContext(rule),
      rule.selector,
      declaration.prop,
      declaration.value,
      declaration.important ? "important" : "normal",
    ].join("\u0000");

    if (seen.has(key)) {
      declaration.remove();
      removed += 1;
      continue;
    }

    seen.add(key);
  }

  root.walkRules((rule) => {
    if (!rule.nodes || rule.nodes.length === 0) {
      rule.remove();
    }
  });

  root.walkAtRules((atRule) => {
    if (atRule.nodes && atRule.nodes.length === 0) {
      atRule.remove();
    }
  });

  fs.writeFileSync(file, `${root.toString()}\n`);
  console.log(JSON.stringify({ file, removed }));
}
