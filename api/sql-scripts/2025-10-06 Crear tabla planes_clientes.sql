ALTER TABLE clients 
DROP COLUMN plan_id;

CREATE TABLE planes_clientes (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    fecha_inicio DATE,
    fecha_fin DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
