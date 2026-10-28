using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace UnityInspect
{
    public static class UnityInspectRuntimeBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void CreateDashboard()
        {
            if (UnityEngine.Object.FindFirstObjectByType<UnityInspectIssueDashboard>() != null)
            {
                return;
            }

            var host = new GameObject("UNITY-INSPECT API Dashboard");
            UnityEngine.Object.DontDestroyOnLoad(host);
            host.AddComponent<UnityInspectIssueDashboard>();
        }
    }

    public sealed class UnityInspectIssueDashboard : MonoBehaviour
    {
        private const string IssuesUrl =
            "http://127.0.0.1:8080/api/issues?page=1&pageSize=100";
        private const int MaxIssues = 100;
        private const float PanelWidth = 390f;

        private readonly List<GameObject> markers = new List<GameObject>();
        private readonly Dictionary<string, GameObject> markerByIssue =
            new Dictionary<string, GameObject>();
        private readonly List<UnityInspectIssue> issues = new List<UnityInspectIssue>();

        private Camera sceneCamera;
        private Transform markerRoot;
        private UnityInspectIssue selectedIssue;
        private Vector2 issueScroll;
        private bool isLoading;
        private string lastError = string.Empty;
        private int totalIssues;
        private int responseCode;
        private float lastLoadedAt;
        private GUIStyle panelStyle;
        private GUIStyle titleStyle;
        private GUIStyle sectionStyle;
        private GUIStyle errorStyle;
        private GUIStyle issueButtonStyle;

        private void Start()
        {
            sceneCamera = Camera.main;
            markerRoot = new GameObject("Issue Markers").transform;
            RefreshIssues();
        }

        private void Update()
        {
            if (!isLoading && selectedIssue != null &&
                markerByIssue.TryGetValue(selectedIssue.id, out var marker))
            {
                var pulse = 1f + Mathf.Sin(Time.time * 4f) * 0.16f;
                marker.transform.localScale = MarkerScale(selectedIssue.priority) * pulse;
            }
        }

        public void RefreshIssues()
        {
            StopAllCoroutines();
            StartCoroutine(LoadIssues());
        }

        private IEnumerator LoadIssues()
        {
            isLoading = true;
            lastError = string.Empty;
            responseCode = 0;

            using (var request = UnityWebRequest.Get(IssuesUrl))
            {
                request.timeout = 10;
                yield return request.SendWebRequest();

                responseCode = (int)request.responseCode;
                if (request.result != UnityWebRequest.Result.Success)
                {
                    lastError = string.IsNullOrWhiteSpace(request.error)
                        ? $"API HTTP {responseCode}"
                        : $"API HTTP {responseCode}: {request.error}";
                    isLoading = false;
                    yield return new WaitForEndOfFrame();
                    WriteSmokeResult(false, lastError);
                    yield break;
                }

                UnityInspectIssueListResponse response = null;
                try
                {
                    response = JsonUtility.FromJson<UnityInspectIssueListResponse>(
                        request.downloadHandler.text);
                }
                catch (Exception exception)
                {
                    lastError = "JSON 解析失败: " + exception.Message;
                }

                if (response == null || response.items == null)
                {
                    if (string.IsNullOrEmpty(lastError))
                    {
                        lastError = "API 返回数据不包含 items 数组";
                    }
                    isLoading = false;
                    yield return new WaitForEndOfFrame();
                    WriteSmokeResult(false, lastError);
                    yield break;
                }

                issues.Clear();
                issues.AddRange(response.items);
                totalIssues = response.total;
                RebuildMarkers();
                FrameScene();
                lastLoadedAt = Time.realtimeSinceStartup;
                isLoading = false;
                yield return new WaitForEndOfFrame();
                WriteSmokeResult(true, string.Empty);
            }
        }

        private void RebuildMarkers()
        {
            foreach (var marker in markers)
            {
                if (marker != null)
                {
                    Destroy(marker);
                }
            }

            markers.Clear();
            markerByIssue.Clear();
            selectedIssue = null;

            foreach (var issue in issues)
            {
                var marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                marker.name = "IssueMarker_" + issue.id;
                marker.transform.SetParent(markerRoot, false);
                marker.transform.localPosition = new Vector3(
                    issue.pos.x,
                    issue.pos.y,
                    issue.pos.z);
                marker.transform.localScale = MarkerScale(issue.priority);

                var renderer = marker.GetComponent<Renderer>();
                var material = new Material(PriorityShader())
                {
                    color = PriorityColor(issue.priority)
                };
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", PriorityColor(issue.priority) * 0.45f);
                renderer.material = material;

                var markerComponent = marker.AddComponent<UnityInspectIssueMarker>();
                markerComponent.Initialize(issue);
                markers.Add(marker);
                markerByIssue[issue.id] = marker;
            }

            if (issues.Count > 0)
            {
                SelectIssue(issues[0]);
            }
        }

        private void SelectIssue(UnityInspectIssue issue)
        {
            if (selectedIssue != null &&
                markerByIssue.TryGetValue(selectedIssue.id, out var previous))
            {
                previous.transform.localScale = MarkerScale(selectedIssue.priority);
            }

            selectedIssue = issue;
            if (selectedIssue != null &&
                markerByIssue.TryGetValue(selectedIssue.id, out var marker))
            {
                marker.transform.localScale = MarkerScale(selectedIssue.priority) * 1.45f;
            }
        }

        private void FrameScene()
        {
            if (sceneCamera == null || issues.Count == 0)
            {
                return;
            }

            var min = new Vector3(float.MaxValue, float.MaxValue, float.MaxValue);
            var max = new Vector3(float.MinValue, float.MinValue, float.MinValue);
            foreach (var issue in issues)
            {
                var point = new Vector3(issue.pos.x, issue.pos.y, issue.pos.z);
                min = Vector3.Min(min, point);
                max = Vector3.Max(max, point);
            }

            var center = (min + max) * 0.5f;
            var span = Mathf.Max(max.x - min.x, max.z - min.z, 10f);
            sceneCamera.transform.position = center + new Vector3(0f, span * 0.72f, -span * 0.92f);
            sceneCamera.transform.LookAt(center);
            sceneCamera.nearClipPlane = 0.05f;
            sceneCamera.farClipPlane = Mathf.Max(1000f, span * 10f);
        }

        private static Vector3 MarkerScale(string priority)
        {
            if (priority == "HIGH")
            {
                return Vector3.one * 0.34f;
            }
            if (priority == "MEDIUM")
            {
                return Vector3.one * 0.27f;
            }
            return Vector3.one * 0.21f;
        }

        private static Color PriorityColor(string priority)
        {
            if (priority == "HIGH")
            {
                return new Color(0.94f, 0.26f, 0.34f);
            }
            if (priority == "MEDIUM")
            {
                return new Color(0.96f, 0.60f, 0.08f);
            }
            return new Color(0.12f, 0.67f, 0.47f);
        }

        private static Shader PriorityShader()
        {
            return Shader.Find("Universal Render Pipeline/Unlit")
                ?? Shader.Find("Unlit/Color")
                ?? Shader.Find("Standard");
        }

        private void OnGUI()
        {
            EnsureStyles();
            var panelRect = new Rect(
                16f,
                16f,
                Mathf.Min(PanelWidth, Screen.width - 32f),
                Screen.height - 32f);
            GUI.Box(panelRect, GUIContent.none, panelStyle);

            GUILayout.BeginArea(new Rect(
                panelRect.x + 14f,
                panelRect.y + 12f,
                panelRect.width - 28f,
                panelRect.height - 24f));

            GUILayout.Label("UNITY-INSPECT", titleStyle);
            GUILayout.Label("Unity REST API · 3D 实时读取验证", sectionStyle);
            GUILayout.Space(4f);

            GUILayout.BeginHorizontal();
            GUI.enabled = !isLoading;
            if (GUILayout.Button(isLoading ? "加载中..." : "刷新问题数据", GUILayout.Height(28f)))
            {
                RefreshIssues();
            }
            GUI.enabled = true;
            GUILayout.Label(
                isLoading ? "HTTP 请求中" : $"加载数量: {issues.Count} / {totalIssues}",
                GUILayout.Height(28f));
            GUILayout.EndHorizontal();

            GUILayout.Label(IssuesUrl, sectionStyle);
            GUILayout.Space(6f);

            if (!string.IsNullOrEmpty(lastError))
            {
                GUILayout.Label(lastError, errorStyle);
                GUILayout.Label("请启动 Go API 后点击“刷新问题数据”。", sectionStyle);
            }
            else if (!isLoading)
            {
                GUILayout.Label(
                    $"已从 API 加载 {issues.Count} 条问题，HTTP {responseCode}。",
                    sectionStyle);
            }

            GUILayout.Label("优先级：红=高 橙=中 绿=低", sectionStyle);
            GUILayout.Space(4f);

            issueScroll = GUILayout.BeginScrollView(
                issueScroll,
                GUILayout.Height(Mathf.Max(120f, panelRect.height - 280f)));
            foreach (var issue in issues)
            {
                var oldColor = GUI.backgroundColor;
                GUI.backgroundColor = PriorityColor(issue.priority);
                if (GUILayout.Button(
                        $"{issue.id}  {issue.title}\n{issue.scene} · {StatusLabel(issue.status)}",
                        issueButtonStyle,
                        GUILayout.Height(44f)))
                {
                    SelectIssue(issue);
                }
                GUI.backgroundColor = oldColor;
            }
            GUILayout.EndScrollView();

            GUILayout.Space(8f);
            GUILayout.Label("选中问题", sectionStyle);
            if (selectedIssue == null)
            {
                GUILayout.Label("点击上方问题可查看坐标与状态。", sectionStyle);
            }
            else
            {
                GUILayout.Label(
                    $"{selectedIssue.id} · {selectedIssue.title}\n" +
                    $"场景：{selectedIssue.scene}   状态：{StatusLabel(selectedIssue.status)}\n" +
                    $"坐标：X {selectedIssue.pos.x:F3} / Y {selectedIssue.pos.y:F3} / Z {selectedIssue.pos.z:F3}",
                    sectionStyle);
            }

            GUILayout.Label(
                lastLoadedAt > 0f
                    ? $"最后刷新：Play Mode {lastLoadedAt:F1}s"
                    : "尚未成功加载",
                sectionStyle);
            GUILayout.Label(
                "WebSocket、真实传感器及复杂数字孪生尚未接入。",
                sectionStyle);

            GUILayout.EndArea();
        }

        private void EnsureStyles()
        {
            if (panelStyle != null)
            {
                return;
            }

            var boxTexture = new Texture2D(1, 1);
            boxTexture.SetPixel(0, 0, new Color(0.045f, 0.07f, 0.12f, 0.94f));
            boxTexture.Apply();

            panelStyle = new GUIStyle(GUI.skin.box);
            panelStyle.normal.background = boxTexture;
            titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 24,
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            sectionStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                wordWrap = true,
                normal = { textColor = new Color(0.78f, 0.84f, 0.93f) }
            };
            errorStyle = new GUIStyle(sectionStyle)
            {
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(1f, 0.48f, 0.52f) }
            };
            issueButtonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 12,
                alignment = TextAnchor.MiddleLeft,
                wordWrap = true,
                padding = new RectOffset(10, 10, 5, 5),
                normal = { textColor = Color.white },
                hover = { textColor = Color.white },
                active = { textColor = Color.white }
            };
        }

        private static string StatusLabel(string status)
        {
            if (status == "OPEN")
            {
                return "打开";
            }
            if (status == "IN_PROGRESS")
            {
                return "处理中";
            }
            if (status == "RESOLVED")
            {
                return "已解决";
            }
            return status;
        }

        private void WriteSmokeResult(bool success, string error)
        {
            var activeFlag = Path.GetFullPath(
                Path.Combine(Application.dataPath, "..", "Temp",
                    "unity-inspect-playmode-active.flag"));
            if (!File.Exists(activeFlag))
            {
                return;
            }

            var result = new UnityInspectSmokeResult
            {
                status = success ? "success" : "error",
                statusCode = responseCode,
                issueCount = issues.Count,
                markerCount = markers.Count,
                total = totalIssues,
                error = error,
                playMode = Application.isPlaying,
                completedAtUtc = DateTime.UtcNow.ToString("O")
            };
            var resultPath = Path.GetFullPath(
                Path.Combine(Application.dataPath, "..", "Temp",
                    "unity-inspect-playmode-result.json"));
            try
            {
                var screenshot = ScreenCapture.CaptureScreenshotAsTexture();
                File.WriteAllBytes(
                    Path.GetFullPath(
                        Path.Combine(Application.dataPath, "..", "Temp",
                            "unity-inspect-playmode.png")),
                    screenshot.EncodeToPNG());
                Destroy(screenshot);
            }
            catch (Exception exception)
            {
                Debug.LogWarning("UNITY_INSPECT_SMOKE_SCREENSHOT_FAILED " + exception.Message);
            }
            File.WriteAllText(resultPath, JsonUtility.ToJson(result, true));
            Debug.Log(
                $"UNITY_INSPECT_SMOKE_RESULT {result.status} total={result.total} " +
                $"issues={result.issueCount} markers={result.markerCount} " +
                $"http={result.statusCode} error={result.error}");
        }
    }

    public sealed class UnityInspectIssueMarker : MonoBehaviour
    {
        public UnityInspectIssue Issue { get; private set; }

        public void Initialize(UnityInspectIssue issue)
        {
            Issue = issue;
        }
    }
}
