package com.profit.acceso.fingerprint;

import com.profit.acceso.ServiceException;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Serializa todas las llamadas al SDK U.are.U en un solo hilo.
 *
 * <p>{@code Engine} e {@code Importer} de {@code UareUGlobal} son objetos JNI y el SDK no
 * garantiza reentrancia: dos peticiones HTTP simultaneas identificando a la vez pueden corromper
 * el estado nativo. Un {@code synchronized} daria exclusion mutua, pero esto ademas garantiza
 * que sea siempre el <b>mismo</b> hilo el que entra al codigo nativo, que algunas librerias JNI
 * exigen. En un kiosco pasa una persona a la vez, asi que no cuesta nada.
 */
public final class NativeExecutor implements AutoCloseable {

  private final ExecutorService executor =
      Executors.newSingleThreadExecutor(
          runnable -> {
            Thread thread = new Thread(runnable, "uareu-native");
            thread.setDaemon(true);
            return thread;
          });

  public <T> T call(String operacion, Callable<T> task) {
    try {
      return executor.submit(task).get();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw ServiceException.huella(operacion + ": interrumpido", e);
    } catch (ExecutionException e) {
      Throwable causa = e.getCause() == null ? e : e.getCause();
      if (causa instanceof ServiceException se) {
        throw se;
      }
      throw ServiceException.huella(operacion + ": " + UareUErrors.describir(causa), causa);
    }
  }

  @Override
  public void close() {
    executor.shutdownNow();
  }
}
