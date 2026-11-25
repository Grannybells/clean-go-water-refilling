import { pool as PoolShim } from './database';

type Pool = typeof PoolShim;

const tableDefinitions: Array<{ name: string; ddl: string }> = [
  {
    name: 'users',
    ddl: `
      IF OBJECT_ID(N'dbo.users', N'U') IS NULL
      CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CONSTRAINT df_users_role DEFAULT 'staff',
        created_at DATETIME2 NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT df_users_updated_at DEFAULT SYSUTCDATETIME()
      );
    `,
  },
  {
    name: 'user_details',
    ddl: `
      IF OBJECT_ID(N'dbo.user_details', N'U') IS NULL
      CREATE TABLE dbo.user_details (
        user_id INT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NULL,
        address VARCHAR(255) NULL,
        birth_date DATE NULL,
        gender VARCHAR(10) NULL CONSTRAINT ck_user_details_gender CHECK (gender IN ('male','female','other')),
        avatar_url VARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_user_details_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT df_user_details_updated_at DEFAULT SYSUTCDATETIME()
      );
    `,
  },
  {
    name: 'user_roles',
    ddl: `
      IF OBJECT_ID(N'dbo.user_roles', N'U') IS NULL
      CREATE TABLE dbo.user_roles (
        role_id INT IDENTITY(1,1) PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_user_roles_created_at DEFAULT SYSUTCDATETIME()
      );
    `,
  },
  {
    name: 'modules',
    ddl: `
      IF OBJECT_ID(N'dbo.modules', N'U') IS NULL
      CREATE TABLE dbo.modules (
        module_name VARCHAR(100) NOT NULL PRIMARY KEY,
        page VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_modules_created_at DEFAULT SYSUTCDATETIME(),
        INDEX idx_modules_page NONCLUSTERED (page)
      );
    `,
  },
  {
    name: 'user_modules',
    ddl: `
      IF OBJECT_ID(N'dbo.user_modules', N'U') IS NULL
      CREATE TABLE dbo.user_modules (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        granted_by INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_user_modules_created_at DEFAULT SYSUTCDATETIME(),
        INDEX idx_user_modules_user NONCLUSTERED (user_id)
      );
    `,
  },
  {
    name: 'module_groups',
    ddl: `
      IF OBJECT_ID(N'dbo.module_groups', N'U') IS NULL
      CREATE TABLE dbo.module_groups (
        id INT IDENTITY(1,1) PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        created_by INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_module_groups_created_at DEFAULT SYSUTCDATETIME(),
        INDEX idx_module_groups_group NONCLUSTERED (group_name)
      );
    `,
  },
  {
    name: 'users_modules_grp',
    ddl: `
      IF OBJECT_ID(N'dbo.users_modules_grp', N'U') IS NULL
      CREATE TABLE dbo.users_modules_grp (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        group_name VARCHAR(100) NOT NULL,
        assigned_by INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_users_modules_grp_created_at DEFAULT SYSUTCDATETIME(),
        INDEX idx_users_modules_grp_user NONCLUSTERED (user_id),
        INDEX idx_users_modules_grp_group NONCLUSTERED (group_name)
      );
    `,
  },
  {
    name: 'branches',
    ddl: `
      IF OBJECT_ID(N'dbo.branches', N'U') IS NULL
      CREATE TABLE dbo.branches (
        branch_id VARCHAR(20) NOT NULL PRIMARY KEY,
        branch_name VARCHAR(150) NOT NULL,
        branch_address VARCHAR(255) NOT NULL,
        branch_lat DECIMAL(10, 7) NULL,
        branch_lng DECIMAL(10, 7) NULL,
        contact_number VARCHAR(30) NULL,
        description NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL CONSTRAINT df_branches_is_active DEFAULT 1,
        created_by INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_branches_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT df_branches_updated_at DEFAULT SYSUTCDATETIME()
      );
    `,
  },
  {
    name: 'settings',
    ddl: `
      IF OBJECT_ID(N'dbo.settings', N'U') IS NULL
      CREATE TABLE dbo.settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        branch_id VARCHAR(20) NULL,
        branch_name VARCHAR(150) NULL,
        user_id INT NULL,
        user_name VARCHAR(255) NULL,
        device_id VARCHAR(190) NULL CONSTRAINT uq_settings_device_id UNIQUE,
        device_name VARCHAR(100) NULL,
        device_model VARCHAR(100) NULL,
        os_name VARCHAR(255) NULL,
        os_version VARCHAR(255) NULL,
        app_version VARCHAR(255) NULL,
        push_token VARCHAR(255) NULL,
        last_seen_at DATETIME2 NULL,
        created_by INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_settings_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT df_settings_updated_at DEFAULT SYSUTCDATETIME()
      );
    `,
  },
  {
    name: 'contracts',
    ddl: `
      IF OBJECT_ID(N'dbo.contracts', N'U') IS NULL
      CREATE TABLE dbo.contracts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        branch_id VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        created_by INT NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT df_contracts_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT df_contracts_updated_at DEFAULT SYSUTCDATETIME()
      );
    `,
  },
];

const updateTriggers: Array<{ table: string; trigger: string }> = [
  { table: 'users',           trigger: 'trg_users_updated_at' },
  { table: 'user_details',    trigger: 'trg_user_details_updated_at' },
  { table: 'branches',        trigger: 'trg_branches_updated_at' },
  { table: 'settings',        trigger: 'trg_settings_updated_at' },
  { table: 'contracts',       trigger: 'trg_contracts_updated_at' },
];

const seedRoles: Array<{ name: string; description: string }> = [
  { name: 'owner', description: 'Top-level account with full system access' },
  { name: 'admin', description: 'Administrator with access to most system areas' },
  { name: 'operator', description: 'Operational staff with day-to-day access' },
  { name: 'staff', description: 'Base staff role (default for new registrations)' },
];

export const ensureSchema = async (pool: Pool): Promise<void> => {
  for (const { name, ddl } of tableDefinitions) {
    await pool.query(ddl);
    console.log(`Schema check: table '${name}' ready.`);
  }

  const pkByTable: Record<string, string> = {
    user_details: 'user_id',
    branches: 'branch_id',
  };
  for (const { table, trigger } of updateTriggers) {
    const pkCol = pkByTable[table] ?? 'id';
    await pool.query(`
      IF OBJECT_ID(N'dbo.${trigger}', N'TR') IS NOT NULL DROP TRIGGER dbo.${trigger};
    `);
    await pool.query(`
      EXEC('
        CREATE TRIGGER dbo.${trigger} ON dbo.${table}
        AFTER UPDATE AS
        BEGIN
          SET NOCOUNT ON;
          UPDATE t SET updated_at = SYSUTCDATETIME()
          FROM dbo.${table} t
          INNER JOIN inserted i ON t.${pkCol} = i.${pkCol};
        END
      ');
    `);
  }
  console.log('Schema check: updated_at triggers ready.');

  for (const role of seedRoles) {
    await pool.query(
      `IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role_name = ?)
         INSERT INTO user_roles (role_name, description) VALUES (?, ?)`,
      [role.name, role.name, role.description]
    );
  }
  console.log('Schema check: default roles seeded.');
};
