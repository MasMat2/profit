
CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    metodo VARCHAR(255) NOT NULL
)

INSERT INTO metodos_pago (metodo) VALUES ('Efectivo');
INSERT INTO metodos_pago (metodo) VALUES ('Tarjeta de Crédito/Débito');
INSERT INTO metodos_pago (metodo) VALUES ('Transferencia');
