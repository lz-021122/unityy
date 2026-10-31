using System;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace UnityInspect.Editor
{
    [InitializeOnLoad]
    public static class UnityInspectPlayModeSmokeController
    {
        private const double TimeoutSeconds = 30d;

        private static readonly string TempDirectory = Path.GetFullPath(
            Path.Combine(Application.dataPath, "..", "Temp"));
        private static readonly string RequestPath =
            Path.Combine(TempDirectory, "unity-inspect-playmode-request.flag");
        private static readonly string ActivePath =
            Path.Combine(TempDirectory, "unity-inspect-playmode-active.flag");
        private static readonly string ResultPath =
            Path.Combine(TempDirectory, "unity-inspect-playmode-result.json");
        private static readonly string FinishedPath =
            Path.Combine(TempDirectory, "unity-inspect-playmode-finished.json");

        private static double startedAt = -1d;
        private static bool exitRequested;

        static UnityInspectPlayModeSmokeController()
        {
            EditorApplication.update += Tick;
        }

        private static void Tick()
        {
            if (!EditorApplication.isPlaying &&
                !EditorApplication.isCompiling &&
                File.Exists(RequestPath))
            {
                StartRequestedSmokeTest();
                return;
            }

            if (!EditorApplication.isPlaying)
            {
                if (exitRequested && File.Exists(ResultPath))
                {
                    File.WriteAllText(
                        FinishedPath,
                        "{\"completedAtUtc\":\"" +
                        DateTime.UtcNow.ToString("O") +
                        "\",\"resultFile\":\"unity-inspect-playmode-result.json\"}");
                    if (File.Exists(ActivePath))
                    {
                        File.Delete(ActivePath);
                    }
                    exitRequested = false;
                    startedAt = -1d;
                }
                return;
            }

            if (!File.Exists(ActivePath))
            {
                return;
            }

            if (startedAt < 0d)
            {
                startedAt = EditorApplication.timeSinceStartup;
            }

            if (File.Exists(ResultPath))
            {
                exitRequested = true;
                EditorApplication.isPlaying = false;
                return;
            }

            if (EditorApplication.timeSinceStartup - startedAt <= TimeoutSeconds)
            {
                return;
            }

            File.WriteAllText(
                ResultPath,
                "{\"status\":\"error\",\"statusCode\":0,\"issueCount\":0," +
                "\"markerCount\":0,\"total\":0,\"error\":\"Play Mode smoke timeout\"," +
                "\"playMode\":true,\"completedAtUtc\":\"" +
                DateTime.UtcNow.ToString("O") +
                "\"}");
            exitRequested = true;
            EditorApplication.isPlaying = false;
        }

        private static void StartRequestedSmokeTest()
        {
            Directory.CreateDirectory(TempDirectory);
            var mode = "basic";
            if (File.Exists(RequestPath))
            {
                var requestedMode = File.ReadAllText(RequestPath).Trim();
                if (!string.IsNullOrWhiteSpace(requestedMode))
                {
                    mode = requestedMode;
                }
            }
            if (File.Exists(ResultPath))
            {
                File.Delete(ResultPath);
            }
            if (File.Exists(FinishedPath))
            {
                File.Delete(FinishedPath);
            }
            if (File.Exists(RequestPath))
            {
                File.Delete(RequestPath);
            }
            File.WriteAllText(ActivePath, mode);
            startedAt = EditorApplication.timeSinceStartup;
            exitRequested = false;
            EditorApplication.isPlaying = true;
        }
    }
}
