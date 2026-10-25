#!/usr/bin/env python3
"""prune_todo.py <repo> <label>: move closed (~~struck~~) rows from TODO.md to docs/planning/done.md
and regenerate TODO-summarized.md from the open rows."""
import re, sys, os, datetime
repo, label = sys.argv[1], sys.argv[2]
todo = os.path.join(repo, 'TODO.md'); done = os.path.join(repo, 'docs/planning/done.md'); summ = os.path.join(repo, 'TODO-summarized.md')
lines = open(todo).read().split('\n')
# split into blocks: a block starts at a '## ' or '### ' heading
blocks, cur = [], []
for l in lines:
    if (l.startswith('## ') or l.startswith('### ')) and cur:
        blocks.append(cur); cur = []
    cur.append(l)
blocks.append(cur)
keep, moved = [], []
for b in blocks:
    h = b[0]
    if h.startswith('### ') and h.startswith('### ~~'):
        moved.append(b)
    else:
        keep.append(b)
out = '\n'.join('\n'.join(b) for b in keep)
out = re.sub(r'\n{3,}', '\n\n', out).rstrip() + '\n'
open(todo, 'w').write(out)
if moved:
    head = '' if os.path.exists(done) else '# Closed backlog rows\n\nRows pruned from `TODO.md` after each sprint, with the proof they were closed on. Newest first.\n'
    old = open(done).read() if os.path.exists(done) else head
    i = old.find('\n## ')
    section = f"\n## Pruned {datetime.date.today()} ({label}): {len(moved)} rows\n\n" + '\n\n'.join('\n'.join(b).strip() for b in moved) + '\n'
    new = (old[:i] + section + old[i:]) if i != -1 else (old.rstrip() + '\n' + section)
    open(done, 'w').write(new)
# summary of open rows by priority section
sec, rows = None, []
for b in keep:
    h = b[0]
    if h.startswith('## '):
        sec = h[3:].strip()
    elif re.match(r'### (P\d) additions$', h):
        sec = re.match(r'### (P\d) additions$', h).group(1) + ' (second review pass)'
    elif h.startswith('### ') and not re.search(r'additions$', h):
        m = re.match(r'### ([A-Z]+-\d+)[^:]*:\s*(.*)', h)
        if m: rows.append((sec, m.group(1), m.group(2).strip()))
groups = {}
for sec, rid, title in rows:
    key = sec or 'Other'
    groups.setdefault(key, []).append((rid, title))
s = ['# TODO Summarized', '', f'Generated {datetime.date.today()} from `TODO.md` ({label}). Closed rows: `docs/planning/done.md`.', '']
for key, items in groups.items():
    s.append(f'## {key}'); s.append('')
    for rid, title in items: s.append(f'- **{rid}**: {title}')
    s.append('')
s += ['---', '', '## Summary', '', f'**Open rows:** {len(rows)}', '']
open(summ, 'w').write('\n'.join(s))
print(f'moved {len(moved)}, open {len(rows)}')
