alter table pagos drop column pago_metodo;


ALTER TABLE public.pagos 
ADD COLUMN metodo_pago_id INTEGER REFERENCES public.metodos_pago(id);