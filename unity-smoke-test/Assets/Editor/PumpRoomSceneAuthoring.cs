using System;
using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.Overlays;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace UnityInspect.Editor
{
    [InitializeOnLoad]
    public static class PumpRoomSceneAuthoring
    {
        private const string ScenePath = "Assets/Scenes/SampleScene.unity";
        private const string MaterialFolder = "Assets/Materials/PumpRoom";
        private static readonly string TempDirectory = Path.GetFullPath(
            Path.Combine(Application.dataPath, "..", "Temp"));
        private static readonly string RequestPath =
            Path.Combine(TempDirectory, "unity-inspect-scene-build.flag");
        private static readonly string ResultPath =
            Path.Combine(TempDirectory, "unity-inspect-scene-build-result.json");
        private static bool buildInProgress;

        static PumpRoomSceneAuthoring()
        {
            EditorApplication.update += Tick;
        }

        [MenuItem("Tools/UNITY-INSPECT/Rebuild Pump Room Scene %#r")]
        public static void RebuildPumpRoomScene()
        {
            if (buildInProgress)
            {
                return;
            }

            buildInProgress = true;
            try
            {
                if (EditorApplication.isPlayingOrWillChangePlaymode)
                {
                    throw new InvalidOperationException(
                        "Exit Play Mode before rebuilding the pump room scene.");
                }

                var currentScene = SceneManager.GetActiveScene();
                if (currentScene.path != ScenePath)
                {
                    currentScene = EditorSceneManager.OpenScene(
                        ScenePath,
                        OpenSceneMode.Single);
                }

                var materials = CreateOrUpdateMaterialAssets();
                var existing = GameObject.Find("Inspection Environment");
                if (existing != null)
                {
                    UnityEngine.Object.DestroyImmediate(existing);
                }

                var root = PumpRoomEnvironmentBuilder.Build(materials);
                ConfigureCamera();
                ConfigureLighting();
                ConfigureRendering();

                EditorSceneManager.MarkSceneDirty(currentScene);
                if (!EditorSceneManager.SaveScene(currentScene))
                {
                    throw new InvalidOperationException("Failed to save SampleScene.");
                }

                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh();
                SelectAndFrameSceneRoot(root);
                WriteResult(true, root);
            }
            catch (Exception exception)
            {
                WriteResult(false, null, exception.ToString());
                Debug.LogException(exception);
            }
            finally
            {
                buildInProgress = false;
            }
        }

        private static void Tick()
        {
            if (!File.Exists(RequestPath) ||
                EditorApplication.isCompiling ||
                EditorApplication.isPlayingOrWillChangePlaymode ||
                buildInProgress)
            {
                return;
            }

            File.Delete(RequestPath);
            RebuildPumpRoomScene();
        }

        [DidReloadScripts]
        private static void CheckRequestAfterReload()
        {
            Tick();
        }

        private static InspectionMaterialPalette CreateOrUpdateMaterialAssets()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Materials"))
            {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }
            if (!AssetDatabase.IsValidFolder(MaterialFolder))
            {
                AssetDatabase.CreateFolder("Assets/Materials", "PumpRoom");
            }

            var runtime = InspectionMaterialPalette.CreateRuntime();
            return new InspectionMaterialPalette
            {
                concreteFloor = SaveOrUpdate(
                    "M_ConcreteFloor", runtime.concreteFloor),
                concreteWall = SaveOrUpdate(
                    "M_ConcreteWall", runtime.concreteWall),
                paintedBlue = SaveOrUpdate(
                    "M_PaintedSteelBlue", runtime.paintedBlue),
                paintedTeal = SaveOrUpdate(
                    "M_PaintedSteelTeal", runtime.paintedTeal),
                galvanizedSteel = SaveOrUpdate(
                    "M_GalvanizedSteel", runtime.galvanizedSteel),
                stainlessSteel = SaveOrUpdate(
                    "M_StainlessSteel", runtime.stainlessSteel),
                darkSteel = SaveOrUpdate(
                    "M_DarkSteel", runtime.darkSteel),
                safetyYellow = SaveOrUpdate(
                    "M_SafetyYellow", runtime.safetyYellow),
                safetyBlack = SaveOrUpdate(
                    "M_SafetyBlack", runtime.safetyBlack),
                cabinetMetal = SaveOrUpdate(
                    "M_CabinetMetal", runtime.cabinetMetal),
                gaugeFace = SaveOrUpdate(
                    "M_GaugeFace", runtime.gaugeFace),
                indicatorGreen = SaveOrUpdate(
                    "M_IndicatorGreen", runtime.indicatorGreen),
                indicatorRed = SaveOrUpdate(
                    "M_IndicatorRed", runtime.indicatorRed),
                indicatorAmber = SaveOrUpdate(
                    "M_IndicatorAmber", runtime.indicatorAmber),
                warmLight = SaveOrUpdate(
                    "M_WarmLight", runtime.warmLight)
            };
        }

        private static Material SaveOrUpdate(string assetName, Material candidate)
        {
            var path = MaterialFolder + "/" + assetName + ".mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null)
            {
                existing.CopyPropertiesFromMaterial(candidate);
                EditorUtility.SetDirty(existing);
                UnityEngine.Object.DestroyImmediate(candidate);
                return existing;
            }

            candidate.name = assetName;
            AssetDatabase.CreateAsset(candidate, path);
            return candidate;
        }

        private static void ConfigureCamera()
        {
            var camera = Camera.main;
            if (camera == null)
            {
                var cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                camera = cameraObject.AddComponent<Camera>();
                cameraObject.AddComponent<AudioListener>();
            }

            var cameraController =
                camera.GetComponent<InspectionCameraController>();
            if (cameraController == null)
            {
                cameraController =
                    camera.gameObject.AddComponent<InspectionCameraController>();
            }
            cameraController.ResetDefaultView();

            var additional = camera.GetComponent<UniversalAdditionalCameraData>();
            if (additional != null)
            {
                additional.renderPostProcessing = true;
                additional.antialiasing =
                    AntialiasingMode.SubpixelMorphologicalAntiAliasing;
                additional.antialiasingQuality = AntialiasingQuality.High;
            }
        }

        private static void ConfigureLighting()
        {
            var directional = GameObject.Find("Directional Light");
            if (directional == null)
            {
                directional = new GameObject("Directional Light");
                directional.AddComponent<Light>().type = LightType.Directional;
            }

            var light = directional.GetComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(0.77f, 0.86f, 1f);
            light.intensity = 0.86f;
            light.shadows = LightShadows.Soft;
            light.shadowStrength = 0.9f;
            directional.transform.rotation = Quaternion.Euler(48f, -32f, 0f);

            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.2f, 0.24f, 0.3f);
            RenderSettings.ambientEquatorColor = new Color(0.13f, 0.16f, 0.19f);
            RenderSettings.ambientGroundColor = new Color(0.045f, 0.05f, 0.06f);
            RenderSettings.ambientIntensity = 0.72f;
            RenderSettings.fog = false;
        }

        private static void ConfigureRendering()
        {
            QualitySettings.shadows = UnityEngine.ShadowQuality.All;
            QualitySettings.shadowResolution = UnityEngine.ShadowResolution.High;
            QualitySettings.shadowDistance = 55f;
        }

        private static void SelectAndFrameSceneRoot(GameObject root)
        {
            Selection.activeGameObject = root;
            EditorGUIUtility.PingObject(root);
            EditorApplication.ExecuteMenuItem("Window/General/Scene");
            EditorApplication.delayCall += () =>
            {
                var sceneView = SceneView.lastActiveSceneView;
                if (sceneView == null)
                {
                    return;
                }
                sceneView.LookAt(
                    new Vector3(1.2f, 1.7f, 3.2f),
                    Quaternion.Euler(16f, 0f, 0f),
                    25f,
                    false,
                    true);
                if (sceneView.TryGetOverlay("AINavigationOverlay", out Overlay navigation))
                {
                    navigation.displayed = false;
                }
                sceneView.Repaint();
            };
        }

        private static void WriteResult(
            bool success,
            GameObject root,
            string error = "")
        {
            Directory.CreateDirectory(TempDirectory);
            var rendererCount = root == null
                ? 0
                : root.GetComponentsInChildren<Renderer>(true).Length;
            var colliderCount = root == null
                ? 0
                : root.GetComponentsInChildren<Collider>(true).Length;
            var surfaceCount = root == null
                ? 0
                : root.GetComponentsInChildren<InspectionSurface>(true).Length;
            var json =
                "{\"status\":\"" + (success ? "success" : "error") + "\"," +
                "\"scenePath\":\"" + ScenePath + "\"," +
                "\"rendererCount\":" + rendererCount + "," +
                "\"colliderCount\":" + colliderCount + "," +
                "\"surfaceCount\":" + surfaceCount + "," +
                "\"error\":\"" + EscapeJson(error) + "\"," +
                "\"completedAtUtc\":\"" + DateTime.UtcNow.ToString("O") + "\"}";
            File.WriteAllText(ResultPath, json);
        }

        private static string EscapeJson(string value)
        {
            return (value ?? string.Empty)
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n");
        }
    }
}
