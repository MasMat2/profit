CREATE TABLE clients (
    id SERIAL PRIMARY KEY, -- Autoincrementa y es clave primaria
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    dob DATE,
    gender VARCHAR(20),
    address TEXT,
    plan_id INT,
    payment_details JSONB, -- Almacena datos de pago como JSON
    medical_notes TEXT
);