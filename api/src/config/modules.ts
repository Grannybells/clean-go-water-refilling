export interface ModuleDef {
  module_name: string;
  page: string;
  action: string;
  description: string;
}

const crud = (page: string, label: string): ModuleDef[] => [
  { module_name: `${page}.view`,   page, action: 'view',   description: `View ${label}` },
  { module_name: `${page}.create`, page, action: 'create', description: `Create ${label}` },
  { module_name: `${page}.edit`,   page, action: 'edit',   description: `Edit ${label}` },
  { module_name: `${page}.delete`, page, action: 'delete', description: `Delete ${label}` },
];

export const MODULE_CATALOG: ModuleDef[] = [
  { module_name: 'home.view', page: 'home', action: 'view', description: 'View home screen' },
  ...crud('customer', 'customers'),
  ...crud('inventory', 'inventory items'),
  ...crud('sales', 'sales records'),
  ...crud('transactions', 'transactions'),
  ...crud('users', 'users'),
  // Settings area — nested sub-pages
  ...crud('settings.device', 'device settings'),
  ...crud('settings.stations', 'stations'),
  ...crud('settings.groups', 'module groups'),
  ...crud('settings.modules', 'module catalog entries'),
];

const ALL_MODULE_NAMES: string[] = MODULE_CATALOG.map((m) => m.module_name);

export const DEFAULT_GROUPS: Record<string, string[]> = {
  staff_defaults: ['home.view', 'customer.view', 'inventory.view'],
  operator_defaults: [
    'home.view',
    'customer.view',
    'inventory.view',
    'sales.view',
    'transactions.view',
  ],
  admin_defaults: [
    'home.view',
    'customer.view',
    'inventory.view',
    'sales.view',
    'transactions.view',
    // Device settings
    'settings.device.view',
    'settings.device.create',
    'settings.device.edit',
    'settings.device.delete',
    // Stations
    'settings.stations.view',
    'settings.stations.create',
    'settings.stations.edit',
    'settings.stations.delete',
  ],
  owner_defaults: ALL_MODULE_NAMES,
};

export const RESERVED_GROUPS: ReadonlySet<string> = new Set(Object.keys(DEFAULT_GROUPS));

export const ROLE_TO_DEFAULT_GROUP: Record<string, string> = {
  staff: 'staff_defaults',
  operator: 'operator_defaults',
  admin: 'admin_defaults',
  owner: 'owner_defaults',
};
