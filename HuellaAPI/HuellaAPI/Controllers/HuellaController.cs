public class IdentifyRequest
{
    public string Sample { get; set; }  // Base64 intermediate from browser
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