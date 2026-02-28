using System;
using System.Collections.Generic;
using System.Configuration;
using DPFP;
using DPFP.Processing;
using DPFP.Verification;
using MySql.Data.MySqlClient;

public class FingerprintService
{
    // FAR threshold — 0.001 = 0.1% false accept rate, adjust as needed
    private const double FAR_THRESHOLD = 0.001;

    private string ConnectionString => 
        ConfigurationManager.ConnectionStrings["DB"].ConnectionString;

    public bool Verify(int socio, string base64Sample, out string message)
    {
        // 1. Import the live scan from browser (INTERMEDIATE format)
        byte[] sampleBytes = Convert.FromBase64String(base64Sample);
        
        var importResult = Importer.ImportFmd(
            sampleBytes,
            Constants.Formats.Fmd.DP_VERIFICATION,
            Constants.Formats.Fmd.DP_VERIFICATION);

        if (importResult.ResultCode != Constants.ResultCode.DP_SUCCESS)
        {
            message = "Invalid fingerprint sample";
            return false;
        }

        Fmd verifyFmd = importResult.Data;

        // 2. Load all stored fingerprints for this member
        var storedTemplates = GetTemplates(socio);

        if (storedTemplates.Count == 0)
        {
            message = "No registered fingerprints found";
            return false;
        }

        // 3. Compare against each registered finger (any match = pass)
        var comparison = new Verification();
        comparison.FARRequested = FAR_THRESHOLD;

        foreach (var (dedo, templateBytes) in storedTemplates)
        {
            try
            {
                var enrollFmd = new Fmd(templateBytes, Constants.Formats.Fmd.DP_REGISTRATION);
                var result = comparison.Verify(verifyFmd, enrollFmd);

                if (result.Verified)
                {
                    message = $"Match on finger {dedo}";
                    return true;
                }
            }
            catch { /* skip corrupt template */ }
        }

        message = "No match found";
        return false;
    }

    private List<(int dedo, byte[] bytes)> GetTemplates(int socio)
    {
        var list = new List<(int, byte[])>();

        using (var conn = new MySqlConnection(ConnectionString))
        using (var cmd = new MySqlCommand(
            "SELECT dedo, huella FROM tbhuellas WHERE socio = @socio", conn))
        {
            cmd.Parameters.AddWithValue("@socio", socio);
            conn.Open();

            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (reader.IsDBNull(1)) continue;

                    string huella = reader.GetString(1);
                    // huella is stored as Base64 text by One Touch SDK
                    byte[] bytes = Convert.FromBase64String(huella);
                    list.Add((reader.GetInt32(0), bytes));
                }
            }
        }

        return list;
    }
}