// core module — minimal configuration entry point
export interface CoreConfig {
  core_config_version: number;
  core_config_name: string;
}

const core_config: CoreConfig = {
  core_config_version: 1,
  core_config_name: 'default',
};

export function getCoreConfig(): CoreConfig {
  return core_config;
}
