using System;
using System.Collections.Generic;
using System.Configuration;
using DPUruNet;
using System.Linq;
using MySql.Data.MySqlClient;

namespace HuellaAPI.Services
{
public class FingerprintService
{
    private const double FAR_THRESHOLD = 0.001;

    private string ConnectionString =>
        ConfigurationManager.ConnectionStrings["DB"].ConnectionString;

    // Returns the matched socio, or null if no match
public int? Identify(string base64Sample, out string message)
    {
            // 1. Import live scan
            //byte[] sampleBytes = Convert.FromBase64String(base64Sample);
        byte[] sampleBytes = Convert.FromBase64String("AQIDBAUG"); // datos dummy en base64
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
            .Select(r => r.HuellaFmd)
            .ToArray();
            

        // 3. Identify — FPIR 21474 ≈ 0.001% false positive rate (from the table in docs)
        // Last param = max candidates to return (1 = we only want the best match)
        IdentifyResult result = Comparison.Identify(
            importResult.Data,  // live FMD
            0,                  // view index
            fmdArray,           // all enrolled FMDs
            21474,              // FPIR threshold
            1);                 // candidates to return

        if (result.ResultCode != Constants.ResultCode.DP_SUCCESS || result.Indexes.Length == 0)
        {
            message = "Huella no reconocida";
            return null;
        }

        // 4. Map candidate index back to socio
        int matchedIndex = result.Indexes[0][0];
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
                        HuellaFmd = Fmd.DeserializeXml(huella)
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
        public byte[] HuellaFmd { get; set; }
    }
}
}