import * as migration_20260329_204320_initial from './20260329_204320_initial';

export const migrations = [
  {
    up: migration_20260329_204320_initial.up,
    down: migration_20260329_204320_initial.down,
    name: '20260329_204320_initial'
  },
];
