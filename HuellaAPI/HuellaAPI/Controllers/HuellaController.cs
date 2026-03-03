using System.Net;
using System.Web.Http;
using HuellaAPI.Services;

namespace HuellaAPI.Controllers
{
    public class IdentifyRequest
    {
        public string Sample { get; set; }
    }

    [RoutePrefix("api/huella")]
    public class HuellaController : ApiController
    {
        private readonly FingerprintService _fp = new FingerprintService();

        [HttpPost, Route("identificar")]
        public IHttpActionResult Identificar([FromBody] IdentifyRequest req)
        {
            if (req == null || string.IsNullOrEmpty(req.Sample))
                return BadRequest("Muestra requerida");

            int? socio = _fp.Identify(req.Sample, out string mensaje);

            if (socio == null)
                return Content(HttpStatusCode.NotFound, new { match = false, mensaje });

            return Ok(new { match = true, socio, mensaje });
        }
    }
}