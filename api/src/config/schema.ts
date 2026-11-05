import { Pool } from 'mysql2/promise';

const tableDefinitions: Array<{ name: string; ddl: string }> = [
  {
    name: 'users',
    ddl: `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'user_details',
    ddl: `
      CREATE TABLE IF NOT EXISTS user_details (
        user_id INT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NULL,
        address VARCHAR(255) NULL,
        birth_date DATE NULL,
        gender ENUM('male', 'female', 'other') NULL,
        avatar_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'user_roles',
    ddl: `
      CREATE TABLE IF NOT EXISTS user_roles (
        role_id INT AUTO_INCREMENT,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (role_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'modules',
    ddl: `
      CREATE TABLE IF NOT EXISTS modules (
        module_name VARCHAR(100) NOT NULL UNIQUE,
        page VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_modules_page (page)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'user_modules',
    ddl: `
      CREATE TABLE IF NOT EXISTS user_modules (
        id INT AUTO_INCREMENT,
        user_id INT NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        granted_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (id),
        KEY idx_user_modules_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'module_groups',
    ddl: `
      CREATE TABLE IF NOT EXISTS module_groups (
        id INT AUTO_INCREMENT,
        group_name VARCHAR(100) NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (id),
        KEY idx_module_groups_group (group_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'users_modules_grp',
    ddl: `
      CREATE TABLE IF NOT EXISTS users_modules_grp (
        id INT AUTO_INCREMENT,
        user_id INT NOT NULL,
        group_name VARCHAR(100) NOT NULL,
        assigned_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (id),
        KEY idx_users_modules_grp_user (user_id),
        KEY idx_users_modules_grp_group (group_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'stations',
    ddl: `
      CREATE TABLE IF NOT EXISTS stations (
        station_id VARCHAR(20) NOT NULL,
        station_name VARCHAR(150) NOT NULL,
        station_address VARCHAR(255) NOT NULL,
        station_lat DECIMAL(10, 7) NULL,
        station_lng DECIMAL(10, 7) NULL,
        contact_number VARCHAR(30) NULL,
        description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'settings',
    ddl: `
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT,
        station_id VARCHAR(20) NULL,
        station_name VARCHAR(150) NULL,
        user_id INT NULL,
        user_name VARCHAR(255) NULL,
        device_id VARCHAR(190) NULL,
        device_name VARCHAR(100) NULL,
        device_model VARCHAR(100) NULL,
        os_name VARCHAR(255) NULL,
        os_version VARCHAR(255) NULL,
        app_version VARCHAR(255) NULL,
        push_token VARCHAR(255) NULL,
        last_seen_at TIMESTAMP NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY (id),
        UNIQUE KEY uq_settings_device_id (device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'contracts',
    ddl: `
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT,
        user_id INT NOT NULL,
        station_id VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
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
    console.log(`Schema check: table \`${name}\` ready.`);
  }

  for (const role of seedRoles) {
    await pool.query(
      'INSERT IGNORE INTO user_roles (role_name, description) VALUES (?, ?)',
      [role.name, role.description]
    );
  }
  console.log('Schema check: default roles seeded.');
};
