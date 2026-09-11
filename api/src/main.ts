import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * La zona horaria se fija aquí y no se deja al ambiente.
 *
 * mysql2 formatea los `Date` que escribimos con la zona del proceso, y BDK guarda reloj de pared
 * de la sucursal (`_latin1'2026-05-23 14:35:26'`, sin zona). La base central corre en UTC y la
 * sucursal en UTC−6: si el API se despliega en un contenedor sin `TZ`, cada asistencia queda 6 h
 * corrida respecto a lo que escribe BDK y la comparación de `diapago` se mueve otro tanto. En
 * desarrollo no se nota porque la máquina ya está en UTC−6, así que es un error que sólo aparece
 * al desplegar.
 *
 * Asignar `process.env.TZ` en caliente sí surte efecto (Node ≥16 rehace el cache de zona), y esto
 * corre antes de que se cree el pool y antes del primer `new Date()` de una petición.
 */
process.env.TZ = process.env.TZ || 'America/Monterrey';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
