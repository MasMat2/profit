using System;
using System.Collections.Generic;
using System.Configuration;
using DPFP;
using DPFP.Verification;
using MySql.Data.MySqlClient;

public class FingerprintService
{
    private const double FAR_THRESHOLD = 0.001;

    private string ConnectionString =>
        ConfigurationManager.ConnectionStrings["DB"].ConnectionString;

    // Returns the matched socio, or null if no match
    public int? Identify(string base64Sample, out string message)
    {
        // 1. Import live scan
        byte[] sampleBytes = Convert.FromBase64String(base64Sample);
        var importResult = Importer.ImportFmd(
            sampleBytes,
            Constants.Formats.Fmd.DP_VERIFICATION,
            Constants.Formats.Fmd.DP_VERIFICATION);

        if (importResult.ResultCode != Constants.ResultCode.DP_SUCCESS)
        {
            message = "Muestra inválida";
            return null;
        }

        // 2. Load ALL templates, keep index→socio map
        var allTemplates = GetAllTemplates();
        if (allTemplates.Count == 0) { message = "Sin huellas registradas"; return null; }

        // Build parallel arrays — Identify returns index into this array
        Fmd[] fmdArray = allTemplates
            .Select(r => new Fmd(r.HuellaBytes, Constants.Formats.Fmd.DP_REGISTRATION))
            .ToArray();

        // 3. Identify — FPIR 21474 ≈ 0.001% false positive rate (from the table in docs)
        // Last param = max candidates to return (1 = we only want the best match)
        DataResult<Candidate[]> result = Comparison.Identify(
            importResult.Data,  // live FMD
            0,                  // view index
            fmdArray,           // all enrolled FMDs
            21474,              // FPIR threshold
            1);                 // candidates to return

        if (result.ResultCode != Constants.ResultCode.DP_SUCCESS || result.Data.Length == 0)
        {
            message = "Huella no reconocida";
            return null;
        }

        // 4. Map candidate index back to socio
        int matchedIndex = result.Data[0].FmdIndex;
        var matched = allTemplates[matchedIndex];

        message = $"Socio identificado (dedo {matched.Dedo})";
        return matched.Socio;
    }
    private List<HuellaRecord> GetAllTemplates()
    {
        var list = new List<HuellaRecord>();

        using (var conn = new MySqlConnection(ConnectionString))
        using (var cmd = new MySqlCommand(
            "SELECT id, socio, dedo, huella FROM tbhuellas WHERE huella IS NOT NULL", conn))
        {
            conn.Open();
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string huella = reader.GetString(3);
                    if (string.IsNullOrEmpty(huella)) continue;

                    list.Add(new HuellaRecord
                    {
                        Id     = reader.GetInt32(0),
                        Socio  = reader.GetInt32(1),
                        Dedo   = reader.GetInt32(2),
                        HuellaBytes = Convert.FromBase64String(huella)
                    });
                }
            }
        }

        return list;
    }

    private class HuellaRecord
    {
        public int Id    { get; set; }
        public int Socio { get; set; }
        public int Dedo  { get; set; }
        public byte[] HuellaBytes { get; set; }
    }
}