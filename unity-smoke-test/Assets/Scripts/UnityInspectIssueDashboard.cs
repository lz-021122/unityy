using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using UnityEngine;
using UnityEngine.InputSystem;
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
        private const string DefaultIssuesBaseUrl = "http://127.0.0.1:8080/api/issues";
        private const float PanelWidth = 390f;
        private const float CapturePanelWidth = 370f;
        private const float MaxRayDistance = 500f;
        private const float SelectedLabelMargin = 24f;
        private const float SelectedLabelGap = 22f;
        private const float SelectedLabelPaddingX = 12f;
        private const float SelectedLabelPaddingY = 10f;
        private const float SelectedLabelMaxTextWidth = 620f;

        private readonly List<GameObject> markers = new List<GameObject>();
        private readonly Dictionary<string, GameObject> markerByIssue =
            new Dictionary<string, GameObject>();
        private readonly Dictionary<string, Material> markerMaterials =
            new Dictionary<string, Material>();
        private readonly List<UnityInspectIssue> issues = new List<UnityInspectIssue>();

        private Camera sceneCamera;
        private string issuesBaseUrl = DefaultIssuesBaseUrl;
        private Transform markerRoot;
        private InspectionCameraController cameraController;
        private UnityInspectIssue selectedIssue;
        private string selectedIssueLabelContent = string.Empty;
        private Rect selectedIssueLabelRect;
        private bool selectedIssueLabelVisible;
        private GameObject pendingMarker;
        private RaycastHit pendingHit;
        private InspectionSurface pendingSurface;
        private string pendingIdempotencyKey = string.Empty;
        private string pendingIdempotencyPayload = string.Empty;
        private string lastIdempotencyKey = string.Empty;
        private string lastCreateRequestBody = string.Empty;
        private bool smokeIdempotencyVerified;
        private string smokeIdempotencyRetryId = string.Empty;
        private string captureTitle = string.Empty;
        private string captureDescription = string.Empty;
        private int capturePriorityIndex = 1;
        private bool isSubmitting;
        private string formFeedback = string.Empty;
        private bool formFeedbackIsError;
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
        private GUIStyle inputStyle;
        private GUIStyle successStyle;
        private GUIStyle selectedIssueLabelTextStyle;
        private Rect dataPanelRect;
        private Rect capturePanelRect;
        private string issuesUrl = DefaultIssuesBaseUrl + "?page=1&pageSize=100";
        private bool interactionSmokeRunning;
        private bool smokeRaycastHit;
        private bool smokeDuplicateRejected;
        private bool smokeCancelRemoved;
        private bool smokeUiClickBlocked;
        private bool smokeCameraNavigationVerified;
        private bool smokeEmptyTitleRejected;
        private bool smokePriorityOptionsVerified;
        private bool smokeLeftLabelVisible;
        private bool smokeCenterLabelVisible;
        private bool smokeRightLabelVisible;
        private UnityInspectLabelBounds smokeLeftLabelBounds = new UnityInspectLabelBounds();
        private UnityInspectLabelBounds smokeCenterLabelBounds = new UnityInspectLabelBounds();
        private UnityInspectLabelBounds smokeRightLabelBounds = new UnityInspectLabelBounds();
        private bool smokeLongTitleLabelVisible;
        private string smokeLongTitle = string.Empty;
        private UnityInspectLabelBounds smokeLongTitleLabelBounds =
            new UnityInspectLabelBounds();
        private bool smokeDynamicPanelLabelVisible;
        private UnityInspectLabelBounds smokeDynamicPanelLabelBounds =
            new UnityInspectLabelBounds();
        private bool smokeSubmitFailureObserved;
        private string smokeSubmitErrorMessage = string.Empty;
        private string smokeCreatedId = string.Empty;
        private string smokeCreatedPriority = string.Empty;
        private string smokeCreatedScene = string.Empty;
        private float smokeCreatedX;
        private float smokeCreatedY;
        private float smokeCreatedZ;
        private int smokeServerCountAfterCreate;
        private int smokeCreateStatusCode;
        private int smokeCleanupStatusCode;
        private bool smokeCleanupSucceeded;
        private int smokeInitialIssueCount;
        private int smokeFinalIssueCount;
        private UnityInspectIssue lastCreatedIssue;
        private int lastSubmissionStatusCode;

        public static bool PointerOverUi { get; private set; }

        public int PendingMarkerCount => pendingMarker == null ? 0 : 1;
        public int SavedMarkerCount => markers.Count;

        private void Start()
        {
            InspectionSceneBuilder.Build();
            issuesBaseUrl = ResolveIssuesBaseUrl();
            issuesUrl = issuesBaseUrl + "?page=1&pageSize=100";
            sceneCamera = Camera.main;
            if (sceneCamera == null)
            {
                var cameraObject = new GameObject("Inspection Camera");
                sceneCamera = cameraObject.AddComponent<Camera>();
                cameraObject.tag = "MainCamera";
            }
            cameraController = sceneCamera.GetComponent<InspectionCameraController>();
            if (cameraController == null)
            {
                cameraController = sceneCamera.gameObject.AddComponent<InspectionCameraController>();
            }
            cameraController.ResetDefaultView();
            markerRoot = new GameObject("Issue Markers").transform;
            markerRoot.SetParent(transform, false);
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

            if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
            {
                CancelPendingIssue();
            }
        }

        public void RefreshIssues()
        {
            StopAllCoroutines();
            StartCoroutine(LoadIssues());
        }

        private IEnumerator LoadIssues(bool allowInteractionSmoke = true)
        {
            isLoading = true;
            lastError = string.Empty;
            responseCode = 0;

            using (var request = UnityWebRequest.Get(issuesUrl))
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
                if (!allowInteractionSmoke)
                {
                    yield break;
                }
                if (allowInteractionSmoke && IsInteractionSmokeRequested() &&
                    !interactionSmokeRunning)
                {
                    interactionSmokeRunning = true;
                    yield return RunInteractionSmoke();
                    interactionSmokeRunning = false;
                    yield break;
                }
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
            selectedIssueLabelContent = string.Empty;
            selectedIssueLabelVisible = false;

            foreach (var issue in issues)
            {
                var marker = new GameObject("IssueMarker_" + issue.id);
                marker.name = "IssueMarker_" + issue.id;
                marker.transform.SetParent(markerRoot, false);
                marker.transform.localPosition = new Vector3(
                    issue.pos.x,
                    issue.pos.y,
                    issue.pos.z);
                marker.transform.localScale = MarkerScale(issue.priority);
                BuildIssueMarkerGeometry(
                    marker.transform,
                    MarkerMaterial(issue.priority));

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
                selectedIssueLabelContent =
                    $"{selectedIssue.id}  {selectedIssue.title}\n" +
                    $"{PriorityLabel(selectedIssue.priority)} · {selectedIssue.scene}";
            }
            else
            {
                selectedIssueLabelContent = string.Empty;
                selectedIssueLabelVisible = false;
            }
        }

        private void FrameScene()
        {
            if (sceneCamera == null)
            {
                return;
            }

            cameraController.ResetDefaultView();
        }

        private static Vector3 MarkerScale(string priority)
        {
            if (priority == "HIGH")
            {
                return Vector3.one * 0.92f;
            }
            if (priority == "MEDIUM")
            {
                return Vector3.one * 0.82f;
            }
            return Vector3.one * 0.72f;
        }

        private static string PriorityLabel(string priority)
        {
            if (priority == "HIGH")
            {
                return "高优先级";
            }
            if (priority == "MEDIUM")
            {
                return "中优先级";
            }
            return "低优先级";
        }

        private void BuildIssueMarkerGeometry(Transform parent, Material material)
        {
            CreateMarkerPart(
                parent,
                "Ground Ring",
                PrimitiveType.Cylinder,
                new Vector3(0f, 0.012f, 0f),
                new Vector3(0.15f, 0.01f, 0.15f),
                Quaternion.identity,
                material);
            CreateMarkerPart(
                parent,
                "Location Stem",
                PrimitiveType.Cylinder,
                new Vector3(0f, 0.12f, 0f),
                new Vector3(0.022f, 0.105f, 0.022f),
                Quaternion.identity,
                material);
            CreateMarkerPart(
                parent,
                "Priority Beacon",
                PrimitiveType.Cube,
                new Vector3(0f, 0.27f, 0f),
                new Vector3(0.12f, 0.12f, 0.12f),
                Quaternion.Euler(45f, 0f, 45f),
                material);
        }

        private GameObject CreateMarkerPart(
            Transform parent,
            string name,
            PrimitiveType primitive,
            Vector3 localPosition,
            Vector3 localScale,
            Quaternion localRotation,
            Material material)
        {
            var part = GameObject.CreatePrimitive(primitive);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = localPosition;
            part.transform.localRotation = localRotation;
            part.transform.localScale = localScale;
            part.GetComponent<Renderer>().sharedMaterial = material;
            var collider = part.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }
            return part;
        }

        private Material MarkerMaterial(string priority)
        {
            if (markerMaterials.TryGetValue(priority, out var existing))
            {
                return existing;
            }

            var color = PriorityColor(priority);
            var material = new Material(PriorityShader())
            {
                name = "IssueMarker_" + priority
            };
            material.SetColor("_BaseColor", color);
            material.SetColor("_Color", color);
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", color * 0.72f);
            markerMaterials[priority] = material;
            return material;
        }

        private void UpdateSelectedIssueLabelLayout()
        {
            selectedIssueLabelVisible = false;
            if (selectedIssue == null ||
                sceneCamera == null ||
                selectedIssueLabelTextStyle == null ||
                string.IsNullOrEmpty(selectedIssueLabelContent) ||
                !markerByIssue.TryGetValue(selectedIssue.id, out var marker))
            {
                return;
            }

            var anchorScreen = sceneCamera.WorldToScreenPoint(
                marker.transform.position + Vector3.up * 0.68f);
            if (anchorScreen.z <= 0f)
            {
                return;
            }

            var safeRect = GetSelectedIssueLabelSafeRect();
            if (safeRect.width <= SelectedLabelPaddingX * 2f + 80f ||
                safeRect.height <= SelectedLabelPaddingY * 2f + 24f)
            {
                return;
            }

            var content = new GUIContent(selectedIssueLabelContent);
            var availableTextWidth = Mathf.Max(
                80f,
                safeRect.width - SelectedLabelPaddingX * 2f);
            var desiredTextSize = selectedIssueLabelTextStyle.CalcSize(content);
            var textWidth = Mathf.Min(
                desiredTextSize.x,
                Mathf.Min(SelectedLabelMaxTextWidth, availableTextWidth));
            var textHeight = selectedIssueLabelTextStyle.CalcHeight(
                content,
                textWidth);
            var labelWidth = Mathf.Ceil(
                Mathf.Min(textWidth, availableTextWidth) +
                SelectedLabelPaddingX * 2f);
            var labelHeight = Mathf.Ceil(
                textHeight + SelectedLabelPaddingY * 2f);

            var anchorGui = new Vector2(
                anchorScreen.x,
                Screen.height - anchorScreen.y);
            selectedIssueLabelRect = new Rect(
                Mathf.Clamp(
                    anchorGui.x - labelWidth * 0.5f,
                    safeRect.xMin,
                    safeRect.xMax - labelWidth),
                Mathf.Clamp(
                    anchorGui.y - labelHeight - SelectedLabelGap,
                    safeRect.yMin,
                    safeRect.yMax - labelHeight),
                labelWidth,
                labelHeight);
            selectedIssueLabelVisible = true;
        }

        private Rect GetSelectedIssueLabelSafeRect()
        {
            var left = dataPanelRect.width > 1f
                ? dataPanelRect.xMax + SelectedLabelMargin
                : PanelWidth + SelectedLabelMargin * 2f;
            var right = Screen.width - SelectedLabelMargin;
            if (pendingMarker != null)
            {
                right = Mathf.Min(right, capturePanelRect.xMin - SelectedLabelMargin);
            }
            return Rect.MinMaxRect(
                Mathf.Max(SelectedLabelMargin, left),
                SelectedLabelMargin,
                Mathf.Min(Screen.width - SelectedLabelMargin, right),
                Screen.height - SelectedLabelMargin);
        }

        private bool IsSelectedIssueLabelInsideSafeViewport()
        {
            UpdateSelectedIssueLabelLayout();
            if (!selectedIssueLabelVisible || sceneCamera == null)
            {
                return false;
            }

            var safeRect = GetSelectedIssueLabelSafeRect();
            return selectedIssueLabelRect.xMin >= safeRect.xMin - 0.5f &&
                selectedIssueLabelRect.xMax <= safeRect.xMax + 0.5f &&
                selectedIssueLabelRect.yMin >= safeRect.yMin - 0.5f &&
                selectedIssueLabelRect.yMax <= safeRect.yMax + 0.5f;
        }

        private UnityInspectLabelBounds CaptureSelectedIssueLabelBounds()
        {
            var safeRect = GetSelectedIssueLabelSafeRect();
            return new UnityInspectLabelBounds
            {
                xMin = selectedIssueLabelRect.xMin,
                yMin = selectedIssueLabelRect.yMin,
                xMax = selectedIssueLabelRect.xMax,
                yMax = selectedIssueLabelRect.yMax,
                safeXMin = safeRect.xMin,
                safeYMin = safeRect.yMin,
                safeXMax = safeRect.xMax,
                safeYMax = safeRect.yMax
            };
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

        private bool TryPlacePendingIssue(Vector2 screenPoint)
        {
            if (isLoading || isSubmitting)
            {
                return false;
            }
            if (pendingMarker != null)
            {
                SetFormFeedback("请先提交或取消当前待提交标记。", true);
                return false;
            }
            if (sceneCamera == null)
            {
                SetFormFeedback("场景相机不可用，无法放置标记。", true);
                return false;
            }

            var ray = sceneCamera.ScreenPointToRay(screenPoint);
            if (!Physics.Raycast(ray, out var hit, MaxRayDistance))
            {
                SetFormFeedback("未命中可巡检表面，请点击地面、墙体、机柜或管线。", true);
                return false;
            }

            var surface = hit.collider.GetComponentInParent<InspectionSurface>();
            if (surface == null)
            {
                SetFormFeedback("该对象不是可巡检表面。", true);
                return false;
            }

            pendingHit = hit;
            pendingSurface = surface;
            captureTitle = string.Empty;
            captureDescription = string.Empty;
            capturePriorityIndex = 1;
            formFeedback = string.Empty;
            formFeedbackIsError = false;
            pendingIdempotencyKey = string.Empty;
            pendingIdempotencyPayload = string.Empty;

            pendingMarker = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pendingMarker.name = "PendingIssueMarker";
            pendingMarker.transform.position = hit.point + hit.normal * 0.07f;
            pendingMarker.transform.localScale = new Vector3(0.28f, 0.035f, 0.28f);
            var markerCollider = pendingMarker.GetComponent<Collider>();
            if (markerCollider != null)
            {
                markerCollider.enabled = false;
            }
            var renderer = pendingMarker.GetComponent<Renderer>();
            renderer.material = new Material(PriorityShader())
            {
                color = new Color(1f, 0.82f, 0.15f)
            };
            renderer.material.EnableKeyword("_EMISSION");
            renderer.material.SetColor(
                "_EmissionColor", new Color(1f, 0.82f, 0.15f) * 0.75f);
            UpdateSelectedIssueLabelLayout();
            return true;
        }

        private void CancelPendingIssue()
        {
            if (pendingMarker == null || isSubmitting)
            {
                return;
            }
            Destroy(pendingMarker);
            pendingMarker = null;
            pendingSurface = null;
            pendingIdempotencyKey = string.Empty;
            pendingIdempotencyPayload = string.Empty;
            captureTitle = string.Empty;
            captureDescription = string.Empty;
            SetFormFeedback("已取消待提交标记。", false);
            if (selectedIssue != null &&
                markerByIssue.TryGetValue(selectedIssue.id, out var selectedMarker))
            {
                UpdateSelectedIssueLabelLayout();
            }
        }

        private IEnumerator SubmitPendingIssue(string submitUrl = null)
        {
            if (pendingMarker == null || pendingSurface == null || isSubmitting)
            {
                yield break;
            }
            if (string.IsNullOrWhiteSpace(captureTitle))
            {
                SetFormFeedback("字段验证失败：问题标题不能为空。", true);
                yield break;
            }

            isSubmitting = true;
            lastCreatedIssue = null;
            lastSubmissionStatusCode = 0;
            formFeedback = string.Empty;
            var priority = PriorityValue(capturePriorityIndex);
            var payload = new UnityInspectCreateIssueRequest
            {
                title = captureTitle.Trim(),
                desc = captureDescription.Trim(),
                priority = priority,
                status = "OPEN",
                scene = pendingSurface.SceneCategory,
                pos = new UnityInspectPosition
                {
                    x = pendingHit.point.x,
                    y = pendingHit.point.y,
                    z = pendingHit.point.z
                },
                screenshot = "/assets/unity-inspect-evidence.png",
                reporter = "Unity 巡检员",
                assignee = "待分派",
                deviceCode = pendingSurface.DeviceCode,
                severityScore = SeverityForPriority(priority)
            };

            var requestBody = JsonUtility.ToJson(payload);
            if (string.IsNullOrEmpty(pendingIdempotencyKey) ||
                pendingIdempotencyPayload != requestBody)
            {
                pendingIdempotencyKey = Guid.NewGuid().ToString("N");
                pendingIdempotencyPayload = requestBody;
            }
            lastIdempotencyKey = pendingIdempotencyKey;
            lastCreateRequestBody = requestBody;

            using (var request = new UnityWebRequest(submitUrl ?? issuesBaseUrl, "POST"))
            {
                var body = System.Text.Encoding.UTF8.GetBytes(requestBody);
                request.uploadHandler = new UploadHandlerRaw(body);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
                request.SetRequestHeader("X-Actor", "unity-inspector");
                request.SetRequestHeader("Idempotency-Key", pendingIdempotencyKey);
                request.timeout = 10;
                yield return request.SendWebRequest();

                if (request.result != UnityWebRequest.Result.Success ||
                    request.responseCode < 200 ||
                    request.responseCode >= 300)
                {
                    var message = $"提交失败（HTTP {request.responseCode}）";
                    if (!string.IsNullOrWhiteSpace(request.downloadHandler.text))
                    {
                        try
                        {
                            var apiError = JsonUtility.FromJson<UnityInspectApiErrorResponse>(
                                request.downloadHandler.text);
                            if (apiError?.error != null && !string.IsNullOrEmpty(apiError.error.message))
                            {
                                message += "：" + apiError.error.message;
                            }
                        }
                        catch
                        {
                            // Keep the HTTP fallback when the error response is not parseable.
                        }
                    }
                    else if (!string.IsNullOrWhiteSpace(request.error))
                    {
                        message += "：" + request.error;
                    }
                    SetFormFeedback(message, true);
                    isSubmitting = false;
                    yield break;
                }

                UnityInspectIssue createdIssue;
                try
                {
                    createdIssue = JsonUtility.FromJson<UnityInspectIssue>(
                        request.downloadHandler.text);
                }
                catch (Exception exception)
                {
                    SetFormFeedback("提交响应解析失败：" + exception.Message, true);
                    isSubmitting = false;
                    yield break;
                }

                lastCreatedIssue = createdIssue;
                lastSubmissionStatusCode = (int)request.responseCode;
                if (ActiveSmokeMode() == "idempotency")
                {
                    yield return VerifyIdempotencyRetry();
                }
                Destroy(pendingMarker);
                pendingMarker = null;
                pendingSurface = null;
                pendingIdempotencyKey = string.Empty;
                pendingIdempotencyPayload = string.Empty;
                captureTitle = string.Empty;
                captureDescription = string.Empty;
                SetFormFeedback($"提交成功：{createdIssue.id}", false);
                yield return LoadIssues(false);
                isSubmitting = false;
            }
        }

        private void SetFormFeedback(string message, bool isError)
        {
            formFeedback = message;
            formFeedbackIsError = isError;
        }

        private static string PriorityValue(int index)
        {
            return index == 0 ? "LOW" : index == 2 ? "HIGH" : "MEDIUM";
        }

        private static int SeverityForPriority(string priority)
        {
            return priority == "HIGH" ? 85 : priority == "MEDIUM" ? 60 : 35;
        }

        private static string ResolveIssuesBaseUrl()
        {
            var overridePath = Path.GetFullPath(
                Path.Combine(Application.dataPath, "..", "Temp",
                    "unity-inspect-api-base.txt"));
            if (!File.Exists(overridePath))
            {
                return DefaultIssuesBaseUrl;
            }

            var value = File.ReadAllText(overridePath).Trim().TrimEnd('/');
            return string.IsNullOrWhiteSpace(value)
                ? DefaultIssuesBaseUrl
                : value;
        }

        private static string TempPath(string fileName)
        {
            return Path.GetFullPath(
                Path.Combine(Application.dataPath, "..", "Temp", fileName));
        }

        private static string ActiveSmokeMode()
        {
            var activePath = TempPath("unity-inspect-playmode-active.flag");
            return File.Exists(activePath)
                ? File.ReadAllText(activePath).Trim()
                : string.Empty;
        }

        private static bool IsInteractionSmokeRequested()
        {
            var mode = ActiveSmokeMode();
            return mode == "interaction" ||
                mode == "submit-error" ||
                mode == "camera-readonly" ||
                mode == "integration" ||
                mode == "idempotency";
        }

        private IEnumerator RunInteractionSmoke()
        {
            smokeInitialIssueCount = issues.Count;
            yield return new WaitForEndOfFrame();

            var surfaces = FindObjectsByType<InspectionSurface>(
                FindObjectsSortMode.None);
            var colliderCount = 0;
            var surfaceCategoriesValid = true;
            foreach (var surface in surfaces)
            {
                var collider = surface.GetComponent<Collider>();
                if (collider != null && collider.enabled)
                {
                    colliderCount++;
                }
                if (!InspectionSurface.IsKnownSceneCategory(surface.SceneCategory))
                {
                    surfaceCategoriesValid = false;
                }
            }
            WriteSurfaceCategoryState(surfaces);

            smokeCameraNavigationVerified = VerifyCameraNavigation();
            smokePriorityOptionsVerified =
                PriorityValue(0) == "LOW" &&
                PriorityValue(1) == "MEDIUM" &&
                PriorityValue(2) == "HIGH";
            FrameScene();
            yield return new WaitForEndOfFrame();

            var leftIssue = issues[0];
            var centerIssue = issues[0];
            var rightIssue = issues[0];
            var centerDistance = float.MaxValue;
            foreach (var issue in issues)
            {
                if (issue.pos.x < leftIssue.pos.x)
                {
                    leftIssue = issue;
                }
                if (issue.pos.x > rightIssue.pos.x)
                {
                    rightIssue = issue;
                }
                var distance = Mathf.Abs(issue.pos.x - 1.2f);
                if (distance < centerDistance)
                {
                    centerDistance = distance;
                    centerIssue = issue;
                }
            }

            SelectIssue(leftIssue);
            yield return new WaitForEndOfFrame();
            smokeLeftLabelVisible = IsSelectedIssueLabelInsideSafeViewport();
            smokeLeftLabelBounds = CaptureSelectedIssueLabelBounds();
            CaptureScreenshot("unity-inspect-label-left.png");

            SelectIssue(centerIssue);
            yield return new WaitForEndOfFrame();
            smokeCenterLabelVisible = IsSelectedIssueLabelInsideSafeViewport();
            smokeCenterLabelBounds = CaptureSelectedIssueLabelBounds();
            CaptureScreenshot("unity-inspect-label-center.png");

            SelectIssue(rightIssue);
            yield return new WaitForEndOfFrame();
            smokeRightLabelVisible = IsSelectedIssueLabelInsideSafeViewport();
            smokeRightLabelBounds = CaptureSelectedIssueLabelBounds();
            CaptureScreenshot("unity-inspect-label-right.png");

            var longTitleIssue = issues[0];
            foreach (var issue in issues)
            {
                if (issue.title.Length > longTitleIssue.title.Length)
                {
                    longTitleIssue = issue;
                }
            }
            SelectIssue(longTitleIssue);
            yield return new WaitForEndOfFrame();
            smokeLongTitle = longTitleIssue.title;
            smokeLongTitleLabelVisible = IsSelectedIssueLabelInsideSafeViewport();
            smokeLongTitleLabelBounds = CaptureSelectedIssueLabelBounds();
            CaptureScreenshot("unity-inspect-label-long-title.png");

            smokeUiClickBlocked =
                !AttemptSceneClick(new Vector2(dataPanelRect.x + 20f, dataPanelRect.y + 20f)) &&
                PendingMarkerCount == 0;

            var requirePumpSurface = ActiveSmokeMode() == "integration";
            if (!TryFindSurfaceScreenPoint(
                    out var targetScreenPoint,
                    requirePumpSurface
                        ? surface =>
                            surface.SceneCategory ==
                                InspectionSurface.PumpRoomCategory &&
                            surface.DeviceCode.StartsWith("PUMP")
                        : null))
            {
                FinishInteractionSmoke("未找到可见的工业巡检表面");
                yield break;
            }

            smokeRaycastHit = AttemptSceneClick(targetScreenPoint) &&
                PendingMarkerCount == 1;
            if (!smokeRaycastHit)
            {
                FinishInteractionSmoke("射线未能在目标表面创建待提交标记");
                yield break;
            }
            if (requirePumpSurface &&
                (pendingSurface.SceneCategory !=
                    InspectionSurface.PumpRoomCategory ||
                 !pendingSurface.DeviceCode.StartsWith("PUMP")))
            {
                FinishInteractionSmoke("射线未命中泵房设备表面");
                yield break;
            }
            yield return new WaitForEndOfFrame();
            smokeDynamicPanelLabelVisible = IsSelectedIssueLabelInsideSafeViewport();
            smokeDynamicPanelLabelBounds = CaptureSelectedIssueLabelBounds();
            CaptureScreenshot("unity-inspect-label-dynamic-panel.png");

            if (ActiveSmokeMode() == "camera-readonly")
            {
                smokeDuplicateRejected =
                    !AttemptSceneClick(targetScreenPoint) &&
                    PendingMarkerCount == 1;
                CancelPendingIssue();
                yield return null;
                smokeCancelRemoved =
                    PendingMarkerCount == 0 &&
                    GameObject.Find("PendingIssueMarker") == null;

                var cameraResetVerified = VerifyCameraReset();
                var mainEquipmentVisible = VerifyMainEquipmentVisible();
                WriteCameraState(cameraResetVerified, mainEquipmentVisible);
                smokeFinalIssueCount = issues.Count;
                smokeCleanupSucceeded =
                    smokeFinalIssueCount == smokeInitialIssueCount;

                FrameScene();
                selectedIssueLabelContent = string.Empty;
                selectedIssueLabelVisible = false;
                yield return new WaitForEndOfFrame();
                CaptureScreenshot("unity-inspect-camera-default-after.png");

                var cameraPassed =
                    surfaces.Length >= 2 &&
                    colliderCount >= 2 &&
                    surfaceCategoriesValid &&
                    smokeCameraNavigationVerified &&
                    cameraResetVerified &&
                    mainEquipmentVisible &&
                    smokeUiClickBlocked &&
                    smokeRaycastHit &&
                    smokeDuplicateRejected &&
                    smokeCancelRemoved &&
                    smokeLeftLabelVisible &&
                    smokeCenterLabelVisible &&
                    smokeRightLabelVisible &&
                    smokeLongTitleLabelVisible &&
                    smokeDynamicPanelLabelVisible &&
                    smokeDynamicPanelLabelBounds.safeXMax <
                        smokeRightLabelBounds.safeXMax &&
                    smokeCleanupSucceeded;
                WriteSmokeResult(
                    cameraPassed,
                    cameraPassed ? string.Empty : "相机或阶段 1 回归断言失败");
                yield break;
            }

            captureTitle = string.Empty;
            captureDescription = "验证空标题不会提交。";
            capturePriorityIndex = 2;
            yield return SubmitPendingIssue();
            smokeEmptyTitleRejected =
                formFeedbackIsError &&
                lastCreatedIssue == null &&
                lastSubmissionStatusCode == 0 &&
                PendingMarkerCount == 1;
            if (!smokeEmptyTitleRejected)
            {
                FinishInteractionSmoke("空标题未按预期被拒绝");
                yield break;
            }

            captureTitle = "Unity Play Mode 验收问题";
            captureDescription = "验证真实射线坐标、唯一标记和 Go API POST。";
            capturePriorityIndex = 2;
            yield return new WaitForEndOfFrame();
            CaptureScreenshot("unity-inspect-playmode-form.png");

            smokeDuplicateRejected =
                !AttemptSceneClick(targetScreenPoint) && PendingMarkerCount == 1;

            CancelPendingIssue();
            yield return null;
            smokeCancelRemoved = PendingMarkerCount == 0 &&
                GameObject.Find("PendingIssueMarker") == null;

            if (!AttemptSceneClick(targetScreenPoint) || PendingMarkerCount != 1)
            {
                FinishInteractionSmoke("取消后无法重新创建待提交标记");
                yield break;
            }

            captureTitle = "Unity Play Mode 验收问题";
            captureDescription = string.Empty;
            capturePriorityIndex = 2;
            var expectedPoint = pendingHit.point;
            var expectedScene = pendingSurface.SceneCategory;
            var expectedDeviceCode = pendingSurface.DeviceCode;

            if (ActiveSmokeMode() == "submit-error")
            {
                yield return SubmitPendingIssue("http://127.0.0.1:1/api/issues");
                smokeSubmitFailureObserved = lastCreatedIssue == null &&
                    formFeedbackIsError &&
                    !string.IsNullOrWhiteSpace(formFeedback);
                smokeSubmitErrorMessage = formFeedback;
                yield return new WaitForEndOfFrame();
                CaptureScreenshot("unity-inspect-playmode-submit-error.png");
                CancelPendingIssue();
                yield return null;
                yield return LoadIssues(false);
                smokeFinalIssueCount = issues.Count;
                smokeCleanupSucceeded = smokeFinalIssueCount == smokeInitialIssueCount;
            }
            else
            {
                yield return SubmitPendingIssue();
                if (lastCreatedIssue == null)
                {
                    FinishInteractionSmoke("提交成功后未获得服务端问题 ID");
                    yield break;
                }

                smokeCreateStatusCode = lastSubmissionStatusCode;
                smokeCreatedId = lastCreatedIssue.id;
                smokeCreatedPriority = lastCreatedIssue.priority;
                smokeCreatedScene = lastCreatedIssue.scene;
                smokeCreatedX = lastCreatedIssue.pos.x;
                smokeCreatedY = lastCreatedIssue.pos.y;
                smokeCreatedZ = lastCreatedIssue.pos.z;
                smokeServerCountAfterCreate = issues.Count;

                yield return new WaitForEndOfFrame();
                CaptureScreenshot("unity-inspect-playmode-submit-success.png");
                if (ActiveSmokeMode() == "idempotency")
                {
                    smokeServerCountAfterCreate = issues.Count;
                    smokeFinalIssueCount = issues.Count;
                    WriteIdempotencyState();
                }
                else if (ActiveSmokeMode() == "integration")
                {
                    smokeFinalIssueCount = issues.Count;
                    WriteIntegrationState(
                        expectedScene,
                        lastCreatedIssue.scene,
                        expectedDeviceCode,
                        lastCreatedIssue.deviceCode);
                }
                else
                {
                    yield return DeleteIssueForSmoke(smokeCreatedId);
                    yield return LoadIssues(false);
                    smokeFinalIssueCount = issues.Count;
                    smokeCleanupSucceeded =
                        smokeCleanupStatusCode == 204 &&
                        smokeFinalIssueCount == smokeInitialIssueCount;
                }
            }

            var coordinateMatches =
                Mathf.Abs(smokeCreatedX - expectedPoint.x) < 0.001f &&
                Mathf.Abs(smokeCreatedY - expectedPoint.y) < 0.001f &&
                Mathf.Abs(smokeCreatedZ - expectedPoint.z) < 0.001f;
            var sceneMatches = smokeCreatedScene == expectedScene;
            var retainForExternalVerification =
                ActiveSmokeMode() == "integration" ||
                ActiveSmokeMode() == "idempotency";
            var passed =
                surfaces.Length >= 2 &&
                colliderCount >= 2 &&
                surfaceCategoriesValid &&
                smokeCameraNavigationVerified &&
                smokeUiClickBlocked &&
                smokeRaycastHit &&
                smokeDuplicateRejected &&
                smokeCancelRemoved &&
                smokeEmptyTitleRejected &&
                smokePriorityOptionsVerified &&
                smokeLeftLabelVisible &&
                smokeCenterLabelVisible &&
                smokeRightLabelVisible &&
                smokeLongTitleLabelVisible &&
                smokeDynamicPanelLabelVisible &&
                smokeDynamicPanelLabelBounds.safeXMax <
                    smokeRightLabelBounds.safeXMax &&
                (retainForExternalVerification || smokeCleanupSucceeded) &&
                (ActiveSmokeMode() != "idempotency" ||
                    smokeIdempotencyVerified) &&
                sceneMatches &&
                (ActiveSmokeMode() == "submit-error"
                    ? smokeSubmitFailureObserved
                    : smokeCreateStatusCode == 201 && coordinateMatches);

            WriteSmokeResult(
                passed,
                passed ? string.Empty : "交互验收断言失败");
        }

        private bool VerifyCameraNavigation()
        {
            var beforePosition = sceneCamera.transform.position;
            var beforeRotation = sceneCamera.transform.rotation;
            cameraController.ApplyNavigationForTest(new Vector2(120f, 35f), "rotate", 0f);
            cameraController.ApplyNavigationForTest(new Vector2(40f, 20f), "pan", 0f);
            cameraController.ApplyNavigationForTest(Vector2.zero, "zoom", 3f);
            return Vector3.Distance(beforePosition, sceneCamera.transform.position) > 0.01f ||
                Quaternion.Angle(beforeRotation, sceneCamera.transform.rotation) > 0.1f;
        }

        private bool VerifyCameraReset()
        {
            FrameScene();
            var firstPosition = sceneCamera.transform.position;
            var firstRotation = sceneCamera.transform.rotation;
            cameraController.ResetDefaultView();
            return Vector3.Distance(
                    firstPosition,
                    sceneCamera.transform.position) < 0.001f &&
                Quaternion.Angle(
                    firstRotation,
                    sceneCamera.transform.rotation) < 0.01f;
        }

        private bool VerifyMainEquipmentVisible()
        {
            var availableRect = Rect.MinMaxRect(
                dataPanelRect.width > 1f
                    ? dataPanelRect.xMax + 12f
                    : PanelWidth + 28f,
                12f,
                Screen.width - 12f,
                Screen.height - 12f);
            return IsObjectBoundsInsideViewport(
                    GameObject.Find("Pump Train P-01"),
                    availableRect) &&
                IsObjectBoundsInsideViewport(
                    GameObject.Find("Pump Train P-02"),
                    availableRect) &&
                IsObjectBoundsInsideViewport(
                    GameObject.Find("Pump Train P-03"),
                    availableRect) &&
                IsObjectBoundsInsideViewport(
                    GameObject.Find("MCC Control Cabinet Bank"),
                    availableRect);
        }

        private bool IsObjectBoundsInsideViewport(
            GameObject target,
            Rect availableRect)
        {
            if (target == null)
            {
                return false;
            }

            var renderers = target.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0)
            {
                return false;
            }

            var bounds = renderers[0].bounds;
            for (var index = 1; index < renderers.Length; index++)
            {
                bounds.Encapsulate(renderers[index].bounds);
            }
            for (var index = 0; index < 8; index++)
            {
                var corner = new Vector3(
                    (index & 1) == 0 ? bounds.min.x : bounds.max.x,
                    (index & 2) == 0 ? bounds.min.y : bounds.max.y,
                    (index & 4) == 0 ? bounds.min.z : bounds.max.z);
                var projected = sceneCamera.WorldToScreenPoint(corner);
                if (projected.z <= 0f ||
                    projected.x < availableRect.xMin ||
                    projected.x > availableRect.xMax ||
                    projected.y < availableRect.yMin ||
                    projected.y > availableRect.yMax)
                {
                    return false;
                }
            }
            return true;
        }

        private void WriteCameraState(
            bool resetVerified,
            bool mainEquipmentVisible)
        {
            var euler = sceneCamera.transform.eulerAngles;
            var position = sceneCamera.transform.position;
            File.WriteAllText(
                TempPath("unity-inspect-camera-state.txt"),
                string.Format(
                    CultureInfo.InvariantCulture,
                    "position={0:F3},{1:F3},{2:F3}\n" +
                    "euler={3:F3},{4:F3},{5:F3}\n" +
                    "fieldOfView={6:F3}\n" +
                    "nearClip={7:F3}\n" +
                    "farClip={8:F3}\n" +
                    "resetVerified={9}\n" +
                    "mainEquipmentVisible={10}\n",
                    position.x,
                    position.y,
                    position.z,
                    euler.x,
                    euler.y,
                    euler.z,
                    sceneCamera.fieldOfView,
                    sceneCamera.nearClipPlane,
                    sceneCamera.farClipPlane,
                    resetVerified,
                    mainEquipmentVisible));
        }

        private void WriteSurfaceCategoryState(
            InspectionSurface[] surfaces)
        {
            var lines = new List<string>();
            var counts = new Dictionary<string, int>
            {
                { InspectionSurface.PumpRoomCategory, 0 },
                { InspectionSurface.ElectricalRoomCategory, 0 },
                { InspectionSurface.PipeAreaCategory, 0 },
                { InspectionSurface.OtherCategory, 0 }
            };
            foreach (var surface in surfaces)
            {
                var category = surface.SceneCategory;
                if (counts.ContainsKey(category))
                {
                    counts[category]++;
                }
                lines.Add(
                    $"{surface.DisplayName}|{surface.DeviceCode}|{category}");
            }
            lines.Insert(
                0,
                $"泵房区={counts[InspectionSurface.PumpRoomCategory]} " +
                $"配电室={counts[InspectionSurface.ElectricalRoomCategory]} " +
                $"管道区={counts[InspectionSurface.PipeAreaCategory]} " +
                $"其他={counts[InspectionSurface.OtherCategory]}");
            File.WriteAllLines(
                TempPath("unity-inspect-surface-categories.txt"),
                lines);
        }

        private void WriteIntegrationState(
            string expectedScene,
            string actualScene,
            string expectedDeviceCode,
            string actualDeviceCode)
        {
            File.WriteAllText(
                TempPath("unity-inspect-integration-state.txt"),
                $"expectedScene={expectedScene}\n" +
                $"actualScene={actualScene}\n" +
                $"expectedDeviceCode={expectedDeviceCode}\n" +
                $"actualDeviceCode={actualDeviceCode}\n");
        }

        private IEnumerator VerifyIdempotencyRetry()
        {
            smokeIdempotencyVerified = false;
            using (var retry = new UnityWebRequest(issuesBaseUrl, "POST"))
            {
                retry.uploadHandler = new UploadHandlerRaw(
                    System.Text.Encoding.UTF8.GetBytes(lastCreateRequestBody));
                retry.downloadHandler = new DownloadHandlerBuffer();
                retry.SetRequestHeader(
                    "Content-Type",
                    "application/json; charset=utf-8");
                retry.SetRequestHeader("X-Actor", "unity-inspector");
                retry.SetRequestHeader("Idempotency-Key", lastIdempotencyKey);
                retry.timeout = 10;
                yield return retry.SendWebRequest();

                if (retry.result != UnityWebRequest.Result.Success)
                {
                    yield break;
                }

                UnityInspectIssue retriedIssue;
                try
                {
                    retriedIssue = JsonUtility.FromJson<UnityInspectIssue>(
                        retry.downloadHandler.text);
                }
                catch
                {
                    yield break;
                }

                smokeIdempotencyVerified =
                    retry.responseCode == 201 &&
                    retriedIssue != null &&
                    retriedIssue.id == lastCreatedIssue.id &&
                    retry.GetResponseHeader("Idempotency-Replayed") == "true";
                smokeIdempotencyRetryId = retriedIssue?.id ?? string.Empty;
            }
        }

        private void WriteIdempotencyState()
        {
            File.WriteAllText(
                TempPath("unity-inspect-idempotency-state.txt"),
                $"key={lastIdempotencyKey}\n" +
                $"firstId={lastCreatedIssue.id}\n" +
                $"retryId={smokeIdempotencyRetryId}\n" +
                $"sameId={smokeIdempotencyVerified}\n" +
                $"serverCount={smokeServerCountAfterCreate}\n");
        }

        private bool TryFindSurfaceScreenPoint(
            out Vector2 screenPoint,
            Func<InspectionSurface, bool> predicate = null)
        {
            var surfaces = FindObjectsByType<InspectionSurface>(
                FindObjectsSortMode.None);
            foreach (var surface in surfaces)
            {
                if (predicate != null && !predicate(surface))
                {
                    continue;
                }
                var collider = surface.GetComponent<Collider>();
                if (collider == null || !collider.enabled)
                {
                    continue;
                }
                var projected = sceneCamera.WorldToScreenPoint(collider.bounds.center);
                if (projected.z <= 0f ||
                    projected.x <= dataPanelRect.xMax + 32f ||
                    projected.y < 32f ||
                    projected.y > Screen.height - 32f)
                {
                    continue;
                }
                screenPoint = new Vector2(projected.x, projected.y);
                return true;
            }
            screenPoint = Vector2.zero;
            return false;
        }

        private void FinishInteractionSmoke(string message)
        {
            if (pendingMarker != null)
            {
                Destroy(pendingMarker);
                pendingMarker = null;
            }
            smokeCleanupSucceeded = true;
            smokeFinalIssueCount = issues.Count;
            WriteSmokeResult(false, message);
        }

        private IEnumerator DeleteIssueForSmoke(string id)
        {
            using (var request = UnityWebRequest.Delete(
                       issuesBaseUrl + "/" + UnityWebRequest.EscapeURL(id)))
            {
                request.SetRequestHeader("X-Actor", "unity-inspector-smoke");
                request.timeout = 10;
                yield return request.SendWebRequest();
                smokeCleanupStatusCode = (int)request.responseCode;
            }
        }

        private void CaptureScreenshot(string fileName)
        {
            try
            {
                var screenshot = ScreenCapture.CaptureScreenshotAsTexture();
                File.WriteAllBytes(TempPath(fileName), screenshot.EncodeToPNG());
                Destroy(screenshot);
            }
            catch (Exception exception)
            {
                Debug.LogWarning("UNITY_INSPECT_SMOKE_SCREENSHOT_FAILED " + exception.Message);
            }
        }

        private void HandleScenePlacementClick(Event currentEvent, Vector2 screenPoint)
        {
            if (currentEvent.type == EventType.MouseDown &&
                currentEvent.button == 0 &&
                !PointerOverUi &&
                GUIUtility.hotControl == 0)
            {
                AttemptSceneClick(screenPoint);
                currentEvent.Use();
            }
        }

        private bool AttemptSceneClick(Vector2 screenPoint)
        {
            if (dataPanelRect.Contains(screenPoint) ||
                (pendingMarker != null && capturePanelRect.Contains(screenPoint)))
            {
                return false;
            }
            return TryPlacePendingIssue(screenPoint);
        }

        private void OnGUI()
        {
            EnsureStyles();
            dataPanelRect = new Rect(
                16f,
                16f,
                Mathf.Min(PanelWidth, Screen.width - 32f),
                Screen.height - 32f);
            var captureWidth = Mathf.Min(CapturePanelWidth, Screen.width - 32f);
            capturePanelRect = new Rect(
                Screen.width - captureWidth - 16f,
                16f,
                captureWidth,
                Mathf.Min(540f, Screen.height - 32f));
            PointerOverUi = dataPanelRect.Contains(Event.current.mousePosition) ||
                (pendingMarker != null && capturePanelRect.Contains(Event.current.mousePosition));

            GUI.Box(dataPanelRect, GUIContent.none, panelStyle);

            GUILayout.BeginArea(new Rect(
                dataPanelRect.x + 14f,
                dataPanelRect.y + 12f,
                dataPanelRect.width - 28f,
                dataPanelRect.height - 24f));

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
            if (GUILayout.Button("视角复位", GUILayout.Height(28f)))
            {
                FrameScene();
            }
            GUILayout.Label(
                isLoading ? "HTTP 请求中" : $"加载数量: {issues.Count} / {totalIssues}",
                GUILayout.Height(28f));
            GUILayout.EndHorizontal();

            GUILayout.Label(issuesUrl, sectionStyle);
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
            if (!string.IsNullOrEmpty(formFeedback) && pendingMarker == null)
            {
                GUILayout.Label(
                    formFeedback,
                    formFeedbackIsError ? errorStyle : successStyle);
            }

            GUILayout.Label("优先级：红=高 橙=中 绿=低", sectionStyle);
            GUILayout.Space(4f);

            issueScroll = GUILayout.BeginScrollView(
                issueScroll,
                GUILayout.Height(Mathf.Max(120f, dataPanelRect.height - 320f)));
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

            if (pendingMarker != null)
            {
                DrawCapturePanel();
            }

            UpdateSelectedIssueLabelLayout();
            if (selectedIssueLabelVisible)
            {
                GUI.Box(selectedIssueLabelRect, GUIContent.none, panelStyle);
                GUI.Label(
                    new Rect(
                        selectedIssueLabelRect.x + SelectedLabelPaddingX,
                        selectedIssueLabelRect.y + SelectedLabelPaddingY,
                        selectedIssueLabelRect.width - SelectedLabelPaddingX * 2f,
                        selectedIssueLabelRect.height - SelectedLabelPaddingY * 2f),
                    selectedIssueLabelContent,
                    selectedIssueLabelTextStyle);
            }

            HandleScenePlacementClick(Event.current, Event.current.mousePosition);
        }

        private void DrawCapturePanel()
        {
            GUI.Box(capturePanelRect, GUIContent.none, panelStyle);
            GUILayout.BeginArea(new Rect(
                capturePanelRect.x + 14f,
                capturePanelRect.y + 12f,
                capturePanelRect.width - 28f,
                capturePanelRect.height - 24f));

            GUILayout.Label("待提交巡检问题", titleStyle);
            GUILayout.Label(
                $"命中对象：{pendingSurface.DisplayName}\n" +
                $"设备编号：{pendingSurface.DeviceCode}",
                sectionStyle);
            GUILayout.Space(8f);

            GUI.enabled = !isSubmitting;
            GUILayout.Label("标题 *", sectionStyle);
            captureTitle = GUILayout.TextField(captureTitle, 200, inputStyle);
            GUILayout.Label("描述（可选）", sectionStyle);
            captureDescription = GUILayout.TextArea(
                captureDescription,
                1000,
                inputStyle,
                GUILayout.Height(72f));
            GUILayout.Label("优先级", sectionStyle);
            capturePriorityIndex = GUILayout.Toolbar(
                capturePriorityIndex,
                new[] { "LOW 低", "MEDIUM 中", "HIGH 高" });
            GUILayout.Label(
                "实际 Unity 世界坐标（射线命中点）",
                sectionStyle);
            GUILayout.Label(
                $"X {pendingHit.point.x.ToString("F3", CultureInfo.InvariantCulture)}   " +
                $"Y {pendingHit.point.y.ToString("F3", CultureInfo.InvariantCulture)}   " +
                $"Z {pendingHit.point.z.ToString("F3", CultureInfo.InvariantCulture)}",
                inputStyle);

            if (!string.IsNullOrEmpty(formFeedback))
            {
                GUILayout.Label(
                    formFeedback,
                    formFeedbackIsError ? errorStyle : successStyle);
            }

            GUILayout.Space(8f);
            GUILayout.BeginHorizontal();
            if (GUILayout.Button(isSubmitting ? "提交中..." : "提交问题", GUILayout.Height(34f)))
            {
                StartCoroutine(SubmitPendingIssue());
            }
            if (GUILayout.Button("取消", GUILayout.Height(34f)))
            {
                CancelPendingIssue();
            }
            GUILayout.EndHorizontal();
            GUI.enabled = true;

            GUILayout.Label(
                "仅保存射线命中位置；截图上传与实时传感器尚未接入。",
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
            successStyle = new GUIStyle(sectionStyle)
            {
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.35f, 0.95f, 0.68f) }
            };
            inputStyle = new GUIStyle(GUI.skin.textField)
            {
                fontSize = 12,
                padding = new RectOffset(8, 8, 6, 6),
                normal = { textColor = new Color(0.12f, 0.16f, 0.22f) },
                focused = { textColor = new Color(0.12f, 0.16f, 0.22f) }
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
            selectedIssueLabelTextStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft,
                wordWrap = true,
                padding = new RectOffset(0, 0, 0, 0),
                normal = { textColor = Color.white }
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
            var activeFlag = TempPath("unity-inspect-playmode-active.flag");
            if (!File.Exists(activeFlag))
            {
                return;
            }

            var surfaces = FindObjectsByType<InspectionSurface>(
                FindObjectsSortMode.None);
            var colliderCount = 0;
            foreach (var surface in surfaces)
            {
                var collider = surface.GetComponent<Collider>();
                if (collider != null && collider.enabled)
                {
                    colliderCount++;
                }
            }
            var result = new UnityInspectSmokeResult
            {
                status = success ? "success" : "error",
                apiBaseUrl = issuesBaseUrl,
                statusCode = responseCode,
                issueCount = issues.Count,
                markerCount = markers.Count,
                total = totalIssues,
                error = error,
                environmentObjectCount = surfaces.Length,
                colliderCount = colliderCount,
                raycastHit = smokeRaycastHit,
                duplicateClickRejected = smokeDuplicateRejected,
                cancelRemovedMarker = smokeCancelRemoved,
                uiClickBlocked = smokeUiClickBlocked,
                cameraNavigationVerified = smokeCameraNavigationVerified,
                emptyTitleRejected = smokeEmptyTitleRejected,
                priorityOptionsVerified = smokePriorityOptionsVerified,
                leftLabelVisible = smokeLeftLabelVisible,
                centerLabelVisible = smokeCenterLabelVisible,
                rightLabelVisible = smokeRightLabelVisible,
                leftLabelBounds = smokeLeftLabelBounds,
                centerLabelBounds = smokeCenterLabelBounds,
                rightLabelBounds = smokeRightLabelBounds,
                longTitleLabelVisible = smokeLongTitleLabelVisible,
                longTitle = smokeLongTitle,
                longTitleLabelBounds = smokeLongTitleLabelBounds,
                dynamicPanelLabelVisible = smokeDynamicPanelLabelVisible,
                dynamicPanelLabelBounds = smokeDynamicPanelLabelBounds,
                submitFailureObserved = smokeSubmitFailureObserved,
                submitErrorMessage = smokeSubmitErrorMessage,
                createdId = smokeCreatedId,
                createdPriority = smokeCreatedPriority,
                createdScene = smokeCreatedScene,
                createdX = smokeCreatedX,
                createdY = smokeCreatedY,
                createdZ = smokeCreatedZ,
                serverCountAfterCreate = smokeServerCountAfterCreate,
                createStatusCode = smokeCreateStatusCode,
                cleanupStatusCode = smokeCleanupStatusCode,
                cleanupSucceeded = smokeCleanupSucceeded,
                finalIssueCount = smokeFinalIssueCount == 0
                    ? issues.Count
                    : smokeFinalIssueCount,
                playMode = Application.isPlaying,
                completedAtUtc = DateTime.UtcNow.ToString("O")
            };
            var resultPath = TempPath("unity-inspect-playmode-result.json");
            try
            {
                var screenshot = ScreenCapture.CaptureScreenshotAsTexture();
                File.WriteAllBytes(
                    TempPath("unity-inspect-playmode.png"),
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
