using UnityEngine;

namespace UnityInspect
{
    public sealed class InspectionSurface : MonoBehaviour
    {
        public const string PumpRoomCategory = "泵房区";
        public const string ElectricalRoomCategory = "配电室";
        public const string PipeAreaCategory = "管道区";
        public const string OtherCategory = "其他";

        [SerializeField] private string displayName;
        [SerializeField] private string deviceCode;
        [SerializeField] private string sceneCategory;

        public string DisplayName => displayName;
        public string DeviceCode => deviceCode;
        public string SceneCategory
        {
            get
            {
                var normalized = sceneCategory?.Trim();
                if (IsKnownSceneCategory(normalized))
                {
                    return normalized;
                }

                var code = deviceCode ?? string.Empty;
                var name = displayName ?? string.Empty;
                if (code.StartsWith("MCC") || name.Contains("配电"))
                {
                    return ElectricalRoomCategory;
                }
                if (code.StartsWith("PIPE") || name.Contains("管道"))
                {
                    return PipeAreaCategory;
                }
                return PumpRoomCategory;
            }
        }

        public void Initialize(
            string displayName,
            string deviceCode,
            string sceneCategory)
        {
            this.displayName = displayName;
            this.deviceCode = deviceCode;
            this.sceneCategory = IsKnownSceneCategory(sceneCategory)
                ? sceneCategory
                : PumpRoomCategory;
        }

        public static bool IsKnownSceneCategory(string value)
        {
            return value == PumpRoomCategory ||
                value == ElectricalRoomCategory ||
                value == PipeAreaCategory ||
                value == OtherCategory;
        }
    }
}
