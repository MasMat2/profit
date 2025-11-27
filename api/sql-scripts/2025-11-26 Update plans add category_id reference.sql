ALTER TABLE public.plans 
add FOREIGN KEY (category_id) 
REFERENCES public.category(id);
