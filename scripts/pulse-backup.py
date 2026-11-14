#!/usr/bin/env python3
"""Standalone, local-only SQLite recovery tool. No application configuration."""
import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import sqlite3
import stat
import sys
import time


class BackupError(Exception):
    pass


def manifest_path(path):
    return Path(str(path) + '.manifest.json')


def sidecars(path):
    return [Path(str(path) + suffix) for suffix in ('-wal', '-shm', '-journal')]


class Budget:
    def __init__(self, seconds):
        self.deadline = time.monotonic() + seconds

    def check(self, *unused):
        if time.monotonic() >= self.deadline:
            raise BackupError('operation timed out')

    def interrupted(self):
        return int(time.monotonic() >= self.deadline)


def regular(path):
    if not stat.S_ISREG(path.lstat().st_mode):
        raise BackupError('input must be a regular file, not a symlink')


def digest(path, budget):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            budget.check()
            value.update(chunk)
    return value.hexdigest()


def read_connection(path, budget, immutable=False):
    regular(path)
    with path.open('rb') as stream:
        if stream.read(16) != b'SQLite format 3\x00':
            raise BackupError('input is not a SQLite database')
    # URI escaping prevents filenames containing ?/# from changing SQLite options.
    uri = path.absolute().as_uri() + '?mode=ro'
    if immutable:
        uri += '&immutable=1'
    db = sqlite3.connect(uri, uri=True, timeout=0.1)
    db.execute('PRAGMA query_only=ON')
    db.execute('PRAGMA trusted_schema=OFF')
    db.set_progress_handler(budget.interrupted, 1000)
    return db


def integrity(db, budget):
    rows = db.execute('PRAGMA integrity_check').fetchall()
    budget.check()
    if rows != [('ok',)]:
        # SQLite diagnostics can include user content; never echo them.
        raise BackupError('SQLite integrity check failed')


def schema_metadata(db):
    # Do not include SQL/default expressions, paths, credentials or row content.
    return {
        'user_version': db.execute('PRAGMA user_version').fetchone()[0],
        'schema_version': db.execute('PRAGMA schema_version').fetchone()[0],
        'application_id': db.execute('PRAGMA application_id').fetchone()[0],
        'objects': [dict(zip(('type', 'name', 'table'), row)) for row in db.execute(
            'SELECT type, name, tbl_name FROM sqlite_schema ORDER BY type, name')],
    }


class Outputs:
    """Exclusive reservations; cleanup only files whose inode we created."""
    def __init__(self):
        self.owned = []

    def create(self, path):
        missing = []
        parent = path.parent
        while not parent.exists():
            missing.append(parent)
            parent = parent.parent
        for directory in reversed(missing):
            directory.mkdir(mode=0o700)
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        info = os.fstat(fd)
        self.owned.append((path, info.st_dev, info.st_ino))
        return fd

    def cleanup(self):
        for path, device, inode in reversed(self.owned):
            try:
                info = path.lstat()
                if (info.st_dev, info.st_ino) == (device, inode):
                    path.unlink()
            except FileNotFoundError:
                pass


def check_destination(source, destination, with_manifest):
    if source.resolve() == destination.resolve():
        raise BackupError('source and destination must differ')
    targets = [destination, *sidecars(destination)]
    if with_manifest:
        targets.append(manifest_path(destination))
    if any(os.path.lexists(path) for path in targets):
        raise BackupError('destination or companion file already exists')


def copy_database(source, destination, budget, outputs):
    os.close(outputs.create(destination))
    with closing(sqlite3.connect(destination, timeout=0.1)) as target:
        target.set_progress_handler(budget.interrupted, 1000)
        source.backup(target, pages=128, progress=budget.check, sleep=0.05)
        # Produce a standalone artifact, including when source uses WAL.
        target.execute('PRAGMA journal_mode=DELETE')
        integrity(target, budget)
        metadata = schema_metadata(target)
    with destination.open('rb') as stream:
        os.fsync(stream.fileno())
    return metadata


def verify(path, budget):
    regular(path)
    if any(os.path.lexists(p) for p in sidecars(path)):
        raise BackupError('backup must be standalone without SQLite sidecars')
    metadata_path = manifest_path(path)
    regular(metadata_path)
    if metadata_path.stat().st_size > 1024 * 1024:
        raise BackupError('manifest too large')
    manifest = json.loads(metadata_path.read_text(encoding='utf-8'))
    if not isinstance(manifest, dict) or manifest.get('format_version') != 1:
        raise BackupError('unsupported or malformed manifest')
    if manifest.get('sha256') != digest(path, budget):
        raise BackupError('backup checksum mismatch')
    with closing(read_connection(path, budget, immutable=True)) as db:
        integrity(db, budget)
        if manifest.get('schema') != schema_metadata(db):
            raise BackupError('schema metadata mismatch')
    return manifest


def positive_timeout(value):
    seconds = float(value)
    if not math.isfinite(seconds) or seconds <= 0 or seconds > 3600:
        raise argparse.ArgumentTypeError('timeout must be > 0 and <= 3600 seconds')
    return seconds


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ('backup', 'verify', 'restore'):
        command = commands.add_parser(name)
        command.add_argument('--source' if name == 'backup' else '--backup',
                             type=Path, required=True)
        if name != 'verify':
            command.add_argument('--destination', type=Path, required=True)
        command.add_argument('--timeout', type=positive_timeout, default=30.0,
                             help='operation budget in seconds (default: 30; max: 3600)')
    args = parser.parse_args(argv)
    budget = Budget(args.timeout)
    outputs = Outputs()
    previous_umask = os.umask(0o077)
    try:
        if args.command == 'verify':
            verify(args.backup, budget)
        else:
            source = args.source if args.command == 'backup' else args.backup
            check_destination(source, args.destination, args.command == 'backup')
            if args.command == 'restore':
                verify(source, budget)
            with closing(read_connection(source, budget, immutable=args.command == 'restore')) as db:
                schema = copy_database(db, args.destination, budget, outputs)
            if args.command == 'backup':
                manifest = {
                    'format_version': 1,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'sqlite_version': sqlite3.sqlite_version,
                    'sha256': digest(args.destination, budget),
                    'schema': schema,
                }
                with os.fdopen(outputs.create(manifest_path(args.destination)), 'w', encoding='utf-8') as stream:
                    json.dump(manifest, stream, indent=2)
                    stream.write('\n')
                    stream.flush()
                    os.fsync(stream.fileno())
        budget.check()
        print(f'{args.command}: ok')
        return 0
    except (BackupError, OSError, sqlite3.Error, ValueError, KeyboardInterrupt) as error:
        outputs.cleanup()
        # Never echo paths, database diagnostics, rows or arbitrary exception text.
        reason = str(error) if isinstance(error, BackupError) else 'operation failed; check inputs and permissions'
        if budget.interrupted():
            reason = 'operation timed out'
        print(f'{args.command}: {reason}', file=sys.stderr)
        return 1
    finally:
        os.umask(previous_umask)


if __name__ == '__main__':
    sys.exit(main())
