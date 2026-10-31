using UnityEngine;

namespace UnityInspect
{
    public static class InspectionSceneBuilder
    {
        private const string EnvironmentRootName = "Inspection Environment";

        public static GameObject Build(
            InspectionMaterialPalette materials = null)
        {
            var existing = GameObject.Find(EnvironmentRootName);
            if (existing != null)
            {
                return existing;
            }

            return PumpRoomEnvironmentBuilder.Build(
                materials ?? InspectionMaterialPalette.CreateRuntime());
        }
    }
}
