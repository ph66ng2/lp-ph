#!/usr/bin/env python3
"""Capture the configured workflow files from GitHub's public API."""
from __future__ import annotations
import base64
import datetime as dt
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
DEST = ROOT / 'data' / 'snapshot.json'
SOURCES = [
    {'owner': 'ph66ng2', 'repo': 'AutoOs', 'branch': 'feature', 'path': '.workflow/workflow.json'},
    {'owner': 'ph66ng2', 'repo': 'AutoBO', 'branch': 'main', 'path': '.workflow/workflow.json'},
    {'owner': 'ph66ng2', 'repo': 'AutoPlatform', 'branch': 'main', 'path': '.workflow/workflow.json'},
]


def get_json(url: str):
    headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'workflow-execution-map',
        'X-GitHub-Api-Version': '2022-11-28',
    }
    if os.environ.get('GITHUB_TOKEN'):
        headers['Authorization'] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def workflow_changes(previous: dict | None, current: dict) -> dict:
    """Compare ticket identities and report direct impact without guessing renames."""
    old_tickets = (previous or {}).get('workflow', {}).get('tickets', [])
    new_tickets = current.get('tickets', [])
    old_by_id = {str(ticket.get('id')): ticket for ticket in old_tickets if ticket.get('id') is not None}
    new_by_id = {str(ticket.get('id')): ticket for ticket in new_tickets if ticket.get('id') is not None}
    added = sorted(set(new_by_id) - set(old_by_id))
    removed = sorted(set(old_by_id) - set(new_by_id))
    title_changes = [
        {'id': ticket_id, 'before': old_by_id[ticket_id].get('title'), 'after': new_by_id[ticket_id].get('title')}
        for ticket_id in sorted(set(old_by_id) & set(new_by_id))
        if old_by_id[ticket_id].get('title') != new_by_id[ticket_id].get('title')
    ]
    removed_impacts = []
    for ticket_id in removed:
        historical_refs = sorted(
            str(ticket.get('id')) for ticket in old_tickets
            if ticket.get('id') != ticket_id and ticket_id in (ticket.get('blockedBy') or [])
        )
        current_refs = sorted(
            str(ticket.get('id')) for ticket in new_tickets
            if ticket_id in (ticket.get('blockedBy') or [])
        )
        removed_impacts.append({
            'id': ticket_id,
            'previousTitle': old_by_id[ticket_id].get('title'),
            'historicalReferences': historical_refs,
            'currentUnresolvedReferences': current_refs,
            'interpretation': 'ID removido; qualquer substituição exige revisão humana. Referências não são redirecionadas automaticamente.',
        })
    return {
        'comparedToPreviousCapture': bool(previous and previous.get('workflow')),
        'addedIds': added,
        'removedIds': removed,
        'removedImpacts': removed_impacts,
        'titleChanges': title_changes,
    }


def main() -> None:
    captured = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    previous = json.loads(DEST.read_text()) if DEST.exists() else {'repositories': []}
    old = {(r.get('owner'), r.get('repo'), r.get('branch')): r for r in previous.get('repositories', [])}
    records = []
    for source in SOURCES:
        key = (source['owner'], source['repo'], source['branch'])
        try:
            base = f"https://api.github.com/repos/{source['owner']}/{source['repo']}"
            repo = get_json(base)
            ref = get_json(f"{base}/branches/{urllib.parse.quote(source['branch'], safe='')}")
            path = urllib.parse.quote(source['path'], safe='/')
            commit_sha = ref['commit']['sha']
            # Pin the file read to the commit whose version metadata we record.
            content = get_json(f"{base}/contents/{path}?ref={urllib.parse.quote(commit_sha, safe='')}")
            raw = base64.b64decode(content['content']).decode('utf-8')
            workflow = json.loads(raw)
            previous_record = old.get(key)
            records.append({
                **source,
                'readStatus': 'ok',
                'visibility': repo.get('visibility', 'unknown'),
                'defaultBranch': repo.get('default_branch'),
                'commit': commit_sha,
                'commitAt': ref['commit']['commit']['committer']['date'],
                'fileBlobSha': content.get('sha'),
                'capturedAt': captured,
                'changes': workflow_changes(previous_record, workflow),
                'sourceUrl': f"https://github.com/{source['owner']}/{source['repo']}/blob/{commit_sha}/{source['path']}",
                'workflow': workflow,
            })
        except Exception as error:
            old_record = old.get(key)
            if old_record:
                records.append({**old_record, 'readStatus': 'stale', 'readError': str(error), 'lastAttemptAt': captured})
            else:
                records.append({**source, 'readStatus': 'error', 'readError': str(error), 'capturedAt': captured})
    snapshot = {
        'captureMode': 'static-github-api-snapshot',
        'capturedAt': captured,
        'repositories': records,
    }
    def identity(record: dict) -> tuple:
        return (record.get('owner'), record.get('repo'), record.get('branch'),
                record.get('fileBlobSha'), record.get('readStatus'), record.get('workflow'))

    if [identity(r) for r in records] == [identity(r) for r in previous.get('repositories', [])]:
        print('Nenhuma mudança nos workflows; captura publicada mantida.')
        return
    DEST.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    print(f"Snapshot gravado em {DEST}")
    for repo in records:
        count = len(repo.get('workflow', {}).get('tickets', []))
        print(f"{repo['owner']}/{repo['repo']}@{repo['branch']}: {repo['readStatus']}, {count} tickets, commit {repo.get('commit', 'indisponível')}")

if __name__ == '__main__':
    main()
