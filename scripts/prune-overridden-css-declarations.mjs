import fs from "node:fs";
import postcss from "postcss";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error(
    "Uso: node scripts/prune-overridden-css-declarations.mjs <archivo.css> [...]",
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

function hasDifferentRule(rules, currentRule) {
  for (const rule of rules) {
    if (rule !== currentRule) {
      return true;
    }
  }

  return false;
}

for (const file of files) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  const cascade = new Map();
  const declarations = [];
  let removed = 0;

  root.walkDecls((declaration) => declarations.push(declaration));

  for (const declaration of declarations.reverse()) {
    const rule = declaration.parent;
    if (!rule || rule.type !== "rule") {
      continue;
    }

    const key = [
      atRuleContext(rule),
      rule.selector,
      declaration.prop.toLowerCase(),
    ].join("\u0000");
    const state = cascade.get(key) ?? {
      importantRules: new Set(),
      normalRules: new Set(),
    };
    const overridden = declaration.important
      ? hasDifferentRule(state.importantRules, rule)
      : hasDifferentRule(state.importantRules, rule) ||
        hasDifferentRule(state.normalRules, rule);

    if (overridden) {
      declaration.remove();
      removed += 1;
    } else if (declaration.important) {
      state.importantRules.add(rule);
    } else {
      state.normalRules.add(rule);
    }

    cascade.set(key, state);
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

  fs.writeFileSync(file, root.toString().replace(/\n+$/, "\n"));
  console.log(JSON.stringify({ file, removed }));
}
