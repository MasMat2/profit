CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    dob DATE,
    gender VARCHAR(20),
    address TEXT,
    plan_id INTEGER  REFERENCES plans(id),
    payment_details JSONB,
    medical_notes TEXT
    
);

