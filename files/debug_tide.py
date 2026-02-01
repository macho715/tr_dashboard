from pathlib import Path
html = Path('AGI TR SCHEDULE_20260130.html').read_text(encoding='utf-8')
idx = html.find('data-voyage="1" data-start')
print('idx:', idx)
if idx >= 0:
    tbody_start = html.find('<tbody>', idx)
    tbody_end = html.find('</tbody>', tbody_start)
    print('tbody_start:', tbody_start, 'tbody_end:', tbody_end)
    old = html[tbody_start:tbody_end+8]
    print('old first 150 chars:', repr(old[:150]))
    new = "<tbody>\n                                <tr>\n                                    <td>13:00</td>\n                                    <td>2.09m</td>\n                                </tr>\n"
    print('old==new (first part):', old[:80] == new[:80])
    print('len old:', len(old), 'len new:', len(new))
