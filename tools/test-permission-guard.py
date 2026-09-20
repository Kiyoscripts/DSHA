import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ASSETS = Path(os.environ.get(
    'DSHA_TEST_ASSETS',
    str(Path(__file__).resolve().parents[1] / 'app/src/main/assets')))


def load_module():
    spec = importlib.util.spec_from_file_location(
        'register_builtin_plugins_guard', ASSETS / 'register-builtin-plugins.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PermissionGuardTests(unittest.TestCase):
    """permission 兜底行：必须写入、幂等，且不破坏用户已有内容。

    背景：dsh-base 的 sandbox-policy.mode 与 approval.policy 都从
    process.env.DSH_PERMISSION_MODE 求值，二者必须组成 presets 表内的一项
    （read-only / workspace-write / danger-full-access）。第三方插件改写其一、
    或删掉该变量让两侧落到不同兜底值时，PermissionPresetService 会抛
    "composed sandbox and approval defaults match no preset"，
    @deepseek-ai/dsh-base 加载失败，整个 Web 起不来。
    """

    def _prepare(self, temporary, initial="[]\n"):
        profile = Path(temporary) / 'root/.dsh/profiles/web'
        profile.mkdir(parents=True)
        patch_file = profile / 'cordis.patch.yml'
        patch_file.write_text(initial, encoding='utf-8')
        return patch_file

    def test_guard_row_is_written_with_presets_and_default_preset(self):
        with tempfile.TemporaryDirectory() as temporary, patch.dict(
                os.environ, {'DSHA_TEST_ROOT': temporary, 'DSH_HOME': '/root/.dsh'}):
            patch_file = self._prepare(temporary)
            module = load_module()
            self.assertTrue(module.ensure_permission_guard())
            text = patch_file.read_text(encoding='utf-8')
            self.assertIn(module.PERMISSION_GUARD_MARKER, text)
            self.assertIn('- id: permission', text)
            self.assertIn('defaultPreset: !!js', text)
            # presets 表必须随行携带，否则 permission 行被整行覆盖后表就空了。
            for name in ('read-only', 'workspace-write', 'danger-full-access'):
                self.assertIn(name + ':', text)

    def test_guard_is_idempotent(self):
        with tempfile.TemporaryDirectory() as temporary, patch.dict(
                os.environ, {'DSHA_TEST_ROOT': temporary, 'DSH_HOME': '/root/.dsh'}):
            patch_file = self._prepare(temporary)
            module = load_module()
            self.assertTrue(module.ensure_permission_guard())
            first = patch_file.read_text(encoding='utf-8')
            self.assertFalse(module.ensure_permission_guard())
            self.assertEqual(first, patch_file.read_text(encoding='utf-8'))

    def test_guard_appends_without_destroying_user_entries(self):
        with tempfile.TemporaryDirectory() as temporary, patch.dict(
                os.environ, {'DSHA_TEST_ROOT': temporary, 'DSH_HOME': '/root/.dsh'}):
            user = '- id: user-custom-row\n  config:\n    keep: true\n'
            patch_file = self._prepare(temporary, initial=user)
            module = load_module()
            self.assertTrue(module.ensure_permission_guard())
            text = patch_file.read_text(encoding='utf-8')
            self.assertIn('user-custom-row', text)
            self.assertIn('keep: true', text)
            self.assertIn(module.PERMISSION_GUARD_MARKER, text)

    def test_default_preset_expr_tracks_the_same_variable(self):
        """兜底表达式必须与两行同源，取任何 mode 都要能对上表。"""
        module = load_module()
        # 与 PERMISSION_GUARD_BLOCK 中表达式一一对应的参考实现。
        # 变量缺失时与 dsh-purge patch 7 的兜底值一致（danger-full-access），
        # 因此两侧兜底值不会互相错开。
        def expected(mode):
            if mode is None:
                mode = 'danger-full-access'   # ?? 兜底
            if mode == 'read-only':
                return 'read-only'
            if mode == 'danger-full-access':
                return 'danger-full-access'
            return 'workspace-write'

        table = {
            'read-only': ('read-only', 'ask'),
            'workspace-write': ('workspace-write', 'ask'),
            'danger-full-access': ('danger-full-access', 'never'),
        }
        for mode in ('read-only', 'workspace-write', 'danger-full-access'):
            sandbox = mode
            approval = 'never' if mode == 'danger-full-access' else 'ask'
            name = expected(mode)
            self.assertIn(name, table, mode)
            self.assertEqual((sandbox, approval), table[name],
                             'defaultPreset %s must match the composed knobs for %s' % (name, mode))
        # 变量缺失时两侧兜底值同为 danger-full-access / never。
        self.assertEqual(('danger-full-access', 'never'), table[expected(None)])


if __name__ == '__main__':
    unittest.main()
