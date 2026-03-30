import * as migration_20260329_204320_initial from './20260329_204320_initial';
import * as migration_20260329_205514_add_repo_url from './20260329_205514_add_repo_url';
import * as migration_20260330_010925_add_pages_url from './20260330_010925_add_pages_url';

export const migrations = [
  {
    up: migration_20260329_204320_initial.up,
    down: migration_20260329_204320_initial.down,
    name: '20260329_204320_initial',
  },
  {
    up: migration_20260329_205514_add_repo_url.up,
    down: migration_20260329_205514_add_repo_url.down,
    name: '20260329_205514_add_repo_url',
  },
  {
    up: migration_20260330_010925_add_pages_url.up,
    down: migration_20260330_010925_add_pages_url.down,
    name: '20260330_010925_add_pages_url'
  },
];
