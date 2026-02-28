using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;

namespace HuellaAPI
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            // Configuración y servicios de API web

            // Rutas de API web
            config.MapHttpAttributeRoutes();

            // config.Routes.MapHttpRoute(
            //     name: "DefaultApi",
            //     routeTemplate: "api/{controller}/{id}",
            //     defaults: new { id = RouteParameter.Optional }
            // );

            // CORS — allow your frontend origin
            config.EnableCors(new System.Web.Http.Cors.EnableCorsAttribute(
                origins: "http://localhost:5500", 
                headers: "*", 
                methods: "POST"));

        }
    }
}
