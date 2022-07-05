import json
from pathlib import Path
from pprint import pformat

snippet_path = Path.cwd() / "snippets"

ABBREVIATION_INDEX_HEADER = '== Snippets by Abbreviation (prefix)\n\n[opts = "autowidth, header"]\n|===\n| Abbreviation | Description | Category'
GROUP_INDEX_HEADER = '== Snippets by Category\n\n[opts = "autowidth, header"]\n|===\n| Category | Abbreviation | Description'
FOOTER = "|===\n\n\n"
GROUPS = {"base": "base Python",
          "cli": "console apps",
          "comprehension": "comprehensions",
          "debug": "logging and debugging",
          "error_handling": "error handling",
          "imports": "imports and shebangs",
          "unittest": "unit testing"}

abbreviation_index = []
group_index = []

for f in snippet_path.iterdir():
    if f.is_file() and f.suffix == ".json":
        group = f.stem
        if group in GROUPS:
            group = GROUPS[group]

        snippets = json.loads(f.read_text())
        for snip in iter(snippets):
            defn = snippets[snip]
            abbreviation_index.append("| {} | {} | {}".format(defn["prefix"], defn["description"] if "description" in defn else snip, group))
            group_index.append("| {} | {} | {}".format(group, defn["prefix"], defn["description"] if "description" in defn else snip))

print(GROUP_INDEX_HEADER)
print("\n".join(sorted(group_index)))
print(FOOTER)
print(ABBREVIATION_INDEX_HEADER)
print("\n".join(sorted(abbreviation_index)))
print(FOOTER)


