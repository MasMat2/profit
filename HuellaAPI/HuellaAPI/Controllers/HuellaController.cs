using System.Net;
using System.Net.Http;
using System.Web.Http;

[RoutePrefix("api/huella")]
public class HuellaController : ApiController
{
    private readonly FingerprintService _fp = new FingerprintService();

    [HttpPost, Route("verificar")]
    public IHttpActionResult Verificar([FromBody] VerifyRequest req)
    {
        if (req == null || string.IsNullOrEmpty(req.Sample))
            return BadRequest("Datos requeridos");

        bool match = _fp.Verify(req.Socio, req.Sample, out string msg);

        return Ok(new { match, mensaje = msg });
    }
}