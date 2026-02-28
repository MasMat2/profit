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
            message = "Muestra de huella inválida";
            return null;
        }

        Fmd verifyFmd = importResult.Data;

        // 2. Load ALL fingerprints from DB
        var allTemplates = GetAllTemplates();

        if (allTemplates.Count == 0)
        {
            message = "No hay huellas registradas";
            return null;
        }

        // 3. Compare against every record
        var comparison = new Verification();
        comparison.FARRequested = FAR_THRESHOLD;

        foreach (var record in allTemplates)
        {
            try
            {
                var enrollFmd = new Fmd(record.HuellaBytes, Constants.Formats.Fmd.DP_REGISTRATION);
                var result = comparison.Verify(verifyFmd, enrollFmd);

                if (result.Verified)
                {
                    message = $"Socio identificado (dedo {record.Dedo})";
                    return record.Socio;
                }
            }
            catch { /* skip corrupt/incompatible template */ }
        }

        message = "Huella no reconocida";
        return null;
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