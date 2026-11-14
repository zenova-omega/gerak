"""Run directly with unittest: deliberately does not load application conftest."""
import hashlib
import json
from pathlib import Path
import sqlite3
import stat
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'pulse-backup.py'


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'source.sqlite'
        with sqlite3.connect(self.source) as db:
            db.execute('CREATE TABLE posts (id INTEGER PRIMARY KEY, body TEXT)')
            db.execute("INSERT INTO posts VALUES (1, 'private fixture content')")
            db.execute('PRAGMA user_version=7')
        self.backup = self.root / 'private' / 'nested' / 'backup.sqlite'

    def cli(self, *args, ok=True):
        result = subprocess.run([sys.executable, str(SCRIPT), *map(str, args)],
                                capture_output=True, text=True, timeout=10)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('private fixture content', result.stdout + result.stderr)
        return result

    def make_backup(self):
        self.cli('backup', '--source', self.source, '--destination', self.backup)
        return Path(str(self.backup) + '.manifest.json')

    def test_roundtrip_manifest_permissions_and_source_unchanged(self):
        before = self.source.read_bytes()
        manifest_path = self.make_backup()
        manifest = json.loads(manifest_path.read_text())
        self.assertEqual(manifest['sha256'], hashlib.sha256(self.backup.read_bytes()).hexdigest())
        self.assertEqual(manifest['schema']['user_version'], 7)
        self.assertNotIn('private fixture content', manifest_path.read_text())
        for path in (self.backup, manifest_path):
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        for path in (self.backup.parent, self.backup.parent.parent):
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o700)
        self.cli('verify', '--backup', self.backup)
        restored = self.root / 'restored.sqlite'
        self.cli('restore', '--backup', self.backup, '--destination', restored)
        with sqlite3.connect(restored) as db:
            self.assertEqual(db.execute('SELECT * FROM posts').fetchall(), [(1, 'private fixture content')])
        self.assertEqual(stat.S_IMODE(restored.stat().st_mode), 0o600)
        self.assertEqual(self.source.read_bytes(), before)

    def test_online_backup_includes_committed_wal_not_uncommitted_rows(self):
        db = sqlite3.connect(self.source)
        self.addCleanup(db.close)
        db.execute('PRAGMA journal_mode=WAL')
        db.execute("INSERT INTO posts VALUES (2, 'committed')")
        db.commit()
        db.execute("INSERT INTO posts VALUES (3, 'pending')")
        self.make_backup()
        with sqlite3.connect(self.backup) as copied:
            self.assertEqual(copied.execute('SELECT id FROM posts ORDER BY id').fetchall(), [(1,), (2,)])

    def test_refuses_existing_destinations_and_same_path(self):
        self.make_backup()
        for destination in (self.source, self.backup, self.root):
            for command, flag, source in [('backup', '--source', self.source), ('restore', '--backup', self.backup)]:
                self.cli(command, flag, source, '--destination', destination, ok=False)
        self.cli('verify', '--backup', self.backup)

    def test_refuses_dangling_symlink_and_existing_manifest(self):
        destination = self.root / 'link.sqlite'
        destination.symlink_to(self.root / 'absent')
        self.cli('backup', '--source', self.source, '--destination', destination, ok=False)
        self.assertTrue(destination.is_symlink())
        self.assertFalse((self.root / 'absent').exists())
        destination = self.root / 'new.sqlite'
        manifest = Path(str(destination) + '.manifest.json')
        manifest.write_text('keep me')
        self.cli('backup', '--source', self.source, '--destination', destination, ok=False)
        self.assertFalse(destination.exists())
        self.assertEqual(manifest.read_text(), 'keep me')

    def test_bad_source_leaves_no_outputs_and_missing_source_not_created(self):
        for source in (self.root / 'missing', self.root / 'invalid'):
            if source.name == 'invalid':
                source.write_bytes(b'not sqlite')
            self.cli('backup', '--source', source, '--destination', self.backup, ok=False)
            self.assertFalse(self.backup.exists())
            self.assertFalse(Path(str(self.backup) + '.manifest.json').exists())
        self.assertFalse((self.root / 'missing').exists())

    def test_checksum_and_integrity_fail_before_restore_creates_file(self):
        manifest_path = self.make_backup()
        self.backup.write_bytes(b'corrupt database')
        restored = self.root / 'restored.sqlite'
        for matching_checksum in (False, True):
            if matching_checksum:
                manifest = json.loads(manifest_path.read_text())
                manifest['sha256'] = hashlib.sha256(self.backup.read_bytes()).hexdigest()
                manifest_path.write_text(json.dumps(manifest))
            self.cli('verify', '--backup', self.backup, ok=False)
            self.cli('restore', '--backup', self.backup, '--destination', restored, ok=False)
            self.assertFalse(restored.exists())

    def test_missing_or_malformed_manifest_is_rejected(self):
        manifest = self.make_backup()
        for data in ('{}', '[]', 'not json'):
            manifest.write_text(data)
            self.cli('verify', '--backup', self.backup, ok=False)
        manifest.unlink()
        self.cli('verify', '--backup', self.backup, ok=False)

    def test_busy_timeout_cleans_owned_outputs(self):
        db = sqlite3.connect(self.source)
        self.addCleanup(db.close)
        db.execute('BEGIN EXCLUSIVE')
        result = self.cli('backup', '--source', self.source, '--destination', self.backup,
                          '--timeout', '0.2', ok=False)
        self.assertIn('timed out', result.stderr)
        self.assertFalse(self.backup.exists())
        self.assertFalse(Path(str(self.backup) + '.manifest.json').exists())

    def test_existing_sqlite_sidecar_is_never_touched(self):
        destination = self.root / 'new.sqlite'
        sidecar = Path(str(destination) + '-wal')
        sidecar.write_bytes(b'keep me')
        self.cli('backup', '--source', self.source, '--destination', destination, ok=False)
        self.assertFalse(destination.exists())
        self.assertEqual(sidecar.read_bytes(), b'keep me')

    def test_empty_source_is_not_treated_as_a_valid_database(self):
        self.source.write_bytes(b'')
        self.cli('backup', '--source', self.source, '--destination', self.backup, ok=False)
        self.assertFalse(self.backup.exists())

    def test_schema_tampering_and_backup_sidecars_are_rejected(self):
        path = self.make_backup()
        original = path.read_text()
        manifest = json.loads(original)
        manifest['schema']['user_version'] = 99
        path.write_text(json.dumps(manifest))
        self.cli('verify', '--backup', self.backup, ok=False)
        path.write_text(original)
        Path(str(self.backup) + '-wal').write_bytes(b'not part of backup')
        self.cli('verify', '--backup', self.backup, ok=False)

    def test_restore_rejects_symlinks_and_sidecars_without_touching_them(self):
        self.make_backup()
        destination = self.root / 'restore.sqlite'
        destination.symlink_to(self.source)
        before = self.source.read_bytes()
        self.cli('restore', '--backup', self.backup, '--destination', destination, ok=False)
        self.assertEqual(self.source.read_bytes(), before)
        destination.unlink()
        sidecar = Path(str(destination) + '-journal')
        sidecar.write_bytes(b'preserve')
        self.cli('restore', '--backup', self.backup, '--destination', destination, ok=False)
        self.assertEqual(sidecar.read_bytes(), b'preserve')
        self.assertFalse(destination.exists())


if __name__ == '__main__':
    unittest.main()
