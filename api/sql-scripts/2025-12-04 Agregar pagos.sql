
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    planes_clientes_id INTEGER NOT NULL REFERENCES planes_clientes(id),
    pago_fecha TIMESTAMP,
    concepto VARCHAR(255) NOT NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    pago_metodo VARCHAR(50)
);
