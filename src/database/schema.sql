PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS barbershops (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE,
 phone TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 barbershop_id INTEGER,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','barber','client')),
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(barbershop_id) REFERENCES barbershops(id)
);

CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 barbershop_id INTEGER NOT NULL,
 name TEXT NOT NULL,
 duration INTEGER NOT NULL,
 price INTEGER NOT NULL,
 description TEXT,
 active INTEGER DEFAULT 1,
 FOREIGN KEY(barbershop_id) REFERENCES barbershops(id)
);

CREATE TABLE IF NOT EXISTS barbers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 barbershop_id INTEGER NOT NULL,
 name TEXT NOT NULL,
 email TEXT,
 phone TEXT,
 specialty TEXT,
 active INTEGER DEFAULT 1,
 FOREIGN KEY(barbershop_id) REFERENCES barbershops(id)
);

CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 barbershop_id INTEGER NOT NULL,
 client_id INTEGER,
 client_name TEXT NOT NULL,
 client_email TEXT,
 client_phone TEXT,
 barber_id INTEGER NOT NULL,
 service_id INTEGER NOT NULL,
 booking_date TEXT NOT NULL,
 booking_time TEXT NOT NULL,
 status TEXT DEFAULT 'pending',
 payment_status TEXT DEFAULT 'pending',
 notes TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(barbershop_id) REFERENCES barbershops(id),
 FOREIGN KEY(client_id) REFERENCES users(id),
 FOREIGN KEY(barber_id) REFERENCES barbers(id),
 FOREIGN KEY(service_id) REFERENCES services(id),
 UNIQUE(barber_id, booking_date, booking_time)
);

CREATE TABLE IF NOT EXISTS payments (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 barbershop_id INTEGER NOT NULL,
 booking_id INTEGER,
 amount INTEGER NOT NULL,
 status TEXT DEFAULT 'pending',
 provider TEXT DEFAULT 'stripe',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 barbershop_id INTEGER NOT NULL,
 plan TEXT DEFAULT 'premium',
 status TEXT DEFAULT 'active',
 amount INTEGER DEFAULT 29990,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_shop_date ON bookings(barbershop_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_users_shop ON users(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop ON services(barbershop_id);
