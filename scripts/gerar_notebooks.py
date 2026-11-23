"""Converte arquivo .py em formato 'percent' (# %% / # %% [markdown]) para .ipynb."""
import json, sys, re
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding='utf8').read()
parts = re.split(r'^# %%(.*)$', text, flags=re.M)
cells = []
for i in range(1, len(parts), 2):
    tag, body = parts[i], parts[i+1].strip('\n')
    if '[markdown]' in tag:
        lines = [l[2:] if l.startswith('# ') else l.lstrip('#') for l in body.split('\n')]
        cells.append({"cell_type": "markdown", "metadata": {}, "source": '\n'.join(lines)})
    else:
        cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": body})
for c in cells:
    s = c["source"].split('\n'); c["source"] = [l + '\n' for l in s[:-1]] + [s[-1]]
nb = {"cells": cells, "metadata": {"accelerator": "GPU", "colab": {"provenance": [], "gpuType": "T4"},
      "kernelspec": {"display_name": "Python 3", "name": "python3"}, "language_info": {"name": "python"}},
      "nbformat": 4, "nbformat_minor": 0}
json.dump(nb, open(dst, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(dst, len(cells), 'células')
