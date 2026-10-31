using UnityEngine;

namespace UnityInspect
{
    public sealed class InspectionMaterialPalette
    {
        public Material concreteFloor;
        public Material concreteWall;
        public Material paintedBlue;
        public Material paintedTeal;
        public Material galvanizedSteel;
        public Material stainlessSteel;
        public Material darkSteel;
        public Material safetyYellow;
        public Material safetyBlack;
        public Material cabinetMetal;
        public Material gaugeFace;
        public Material indicatorGreen;
        public Material indicatorRed;
        public Material indicatorAmber;
        public Material warmLight;

        public static InspectionMaterialPalette CreateRuntime()
        {
            return new InspectionMaterialPalette
            {
                concreteFloor = CreateMaterial(
                    new Color(0.3f, 0.33f, 0.35f), 0.05f, 0.22f),
                concreteWall = CreateMaterial(
                    new Color(0.48f, 0.5f, 0.47f), 0.02f, 0.12f),
                paintedBlue = CreateMaterial(
                    new Color(0.025f, 0.22f, 0.48f), 0.34f, 0.58f),
                paintedTeal = CreateMaterial(
                    new Color(0.015f, 0.28f, 0.27f), 0.32f, 0.56f),
                galvanizedSteel = CreateMaterial(
                    new Color(0.36f, 0.43f, 0.48f), 0.72f, 0.44f),
                stainlessSteel = CreateMaterial(
                    new Color(0.72f, 0.76f, 0.79f), 0.92f, 0.78f),
                darkSteel = CreateMaterial(
                    new Color(0.045f, 0.055f, 0.07f), 0.82f, 0.3f),
                safetyYellow = CreateMaterial(
                    new Color(0.94f, 0.55f, 0.015f), 0.08f, 0.38f),
                safetyBlack = CreateMaterial(
                    new Color(0.012f, 0.015f, 0.018f), 0.15f, 0.2f),
                cabinetMetal = CreateMaterial(
                    new Color(0.16f, 0.21f, 0.25f), 0.58f, 0.52f),
                gaugeFace = CreateMaterial(
                    new Color(0.88f, 0.86f, 0.72f), 0.05f, 0.28f),
                indicatorGreen = CreateEmissiveMaterial(
                    new Color(0.06f, 0.95f, 0.38f), 3.5f),
                indicatorRed = CreateEmissiveMaterial(
                    new Color(1f, 0.08f, 0.04f), 4f),
                indicatorAmber = CreateEmissiveMaterial(
                    new Color(1f, 0.43f, 0.025f), 3.8f),
                warmLight = CreateEmissiveMaterial(
                    new Color(1f, 0.72f, 0.34f), 2.2f)
            };
        }

        private static Material CreateMaterial(
            Color color,
            float metallic,
            float smoothness)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit")
                ?? Shader.Find("Standard");
            var material = new Material(shader)
            {
                name = "PumpRoom_RuntimeMaterial"
            };
            material.SetColor("_BaseColor", color);
            material.SetFloat("_Metallic", metallic);
            material.SetFloat("_Smoothness", smoothness);
            return material;
        }

        private static Material CreateEmissiveMaterial(Color color, float intensity)
        {
            var material = CreateMaterial(color, 0.1f, 0.4f);
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", color * intensity);
            material.globalIlluminationFlags =
                MaterialGlobalIlluminationFlags.RealtimeEmissive;
            return material;
        }
    }

    public static class PumpRoomEnvironmentBuilder
    {
        private const string RootName = "Inspection Environment";

        public static GameObject Build(InspectionMaterialPalette materials)
        {
            var root = new GameObject(RootName);
            var architecture = CreateGroup(root.transform, "Architecture");
            var processEquipment = CreateGroup(root.transform, "Process Equipment");
            var electrical = CreateGroup(root.transform, "Electrical & Controls");
            var utilities = CreateGroup(root.transform, "Safety & Utilities");

            BuildArchitecture(architecture.transform, materials);
            BuildPumpTrain(
                processEquipment.transform,
                "Pump Train P-01",
                new Vector3(-8f, 0f, 3.5f),
                "1 号循环水泵组",
                "PUMP-P01",
                "P-01",
                materials,
                materials.paintedBlue);
            BuildPumpTrain(
                processEquipment.transform,
                "Pump Train P-02",
                new Vector3(0f, 0f, 4.4f),
                "2 号循环水泵组",
                "PUMP-P02",
                "P-02",
                materials,
                materials.paintedBlue);
            BuildPumpTrain(
                processEquipment.transform,
                "Pump Train P-03",
                new Vector3(8f, 0f, 3.5f),
                "3 号备用循环水泵组",
                "PUMP-P03",
                "P-03",
                materials,
                materials.paintedTeal);

            BuildPipeHeader(processEquipment.transform, materials);
            BuildCabinetBank(electrical.transform, materials);
            BuildDrainageAndSafety(utilities.transform, materials);
            BuildIndustrialLighting(root.transform, materials);

            return root;
        }

        private static void BuildArchitecture(
            Transform parent,
            InspectionMaterialPalette materials)
        {
            var floor = CreateBox(
                parent,
                "Concrete Floor",
                new Vector3(1f, -0.15f, 2f),
                new Vector3(46f, 0.3f, 32f),
                materials.concreteFloor,
                true);
            AddSurface(
                floor,
                "泵房混凝土地面",
                "FLOOR-PUMP",
                InspectionSurface.PumpRoomCategory);

            var backWall = CreateBox(
                parent,
                "North Concrete Wall",
                new Vector3(1f, 3.5f, 17.8f),
                new Vector3(46f, 7f, 0.4f),
                materials.concreteWall,
                true);
            AddSurface(
                backWall,
                "北侧泵房墙面",
                "WALL-NORTH",
                InspectionSurface.PumpRoomCategory);

            var leftWall = CreateBox(
                parent,
                "West Concrete Wall",
                new Vector3(-22f, 3.5f, 2f),
                new Vector3(0.4f, 7f, 32f),
                materials.concreteWall,
                true);
            AddSurface(
                leftWall,
                "西侧泵房墙面",
                "WALL-WEST",
                InspectionSurface.PumpRoomCategory);

            var rightWall = CreateBox(
                parent,
                "East Concrete Wall",
                new Vector3(24f, 3.5f, 2f),
                new Vector3(0.4f, 7f, 32f),
                materials.concreteWall,
                true);
            AddSurface(
                rightWall,
                "东侧泵房墙面",
                "WALL-EAST",
                InspectionSurface.PumpRoomCategory);

            CreateBox(
                parent,
                "Front Left Wing Wall",
                new Vector3(-15f, 2.3f, -13.8f),
                new Vector3(14f, 4.6f, 0.4f),
                materials.concreteWall);
            CreateBox(
                parent,
                "Front Right Wing Wall",
                new Vector3(17f, 2.3f, -13.8f),
                new Vector3(14f, 4.6f, 0.4f),
                materials.concreteWall);

            for (var x = -21f; x <= 23f; x += 4f)
            {
                CreateBox(
                    parent,
                    $"Floor Slab Joint {x}",
                    new Vector3(x, 0.008f, 2f),
                    new Vector3(0.035f, 0.012f, 31.4f),
                    materials.darkSteel);
            }

            for (var z = -12f; z <= 17f; z += 4f)
            {
                CreateBox(
                    parent,
                    $"Transverse Floor Joint {z}",
                    new Vector3(1f, 0.008f, z),
                    new Vector3(45.4f, 0.012f, 0.035f),
                    materials.darkSteel);
            }

            CreateBox(
                parent,
                "North Wall Safety Band",
                new Vector3(1f, 0.6f, 17.55f),
                new Vector3(45.2f, 0.18f, 0.04f),
                materials.safetyYellow);
            CreateBox(
                parent,
                "West Wall Safety Band",
                new Vector3(-21.75f, 0.6f, 2f),
                new Vector3(0.04f, 0.18f, 31.4f),
                materials.safetyYellow);

            foreach (var x in new[] { -17f, -5f, 7f, 19f })
            {
                CreateBox(
                    parent,
                    $"Concrete Column {x}",
                    new Vector3(x, 3.15f, 16.4f),
                    new Vector3(0.62f, 6.3f, 0.62f),
                    materials.concreteWall);
                CreateBox(
                    parent,
                    $"Column Base Plate {x}",
                    new Vector3(x, 0.12f, 16.4f),
                    new Vector3(1.05f, 0.24f, 1.05f),
                    materials.darkSteel);
            }

            foreach (var x in new[] { -18f, 18f })
            {
                CreateBox(
                    parent,
                    $"Front Structural Column {x}",
                    new Vector3(x, 3.15f, -12.8f),
                    new Vector3(0.62f, 6.3f, 0.62f),
                    materials.concreteWall);
            }

            CreateIBeam(parent, "Roof Beam North", 14.8f, materials);
            CreateIBeam(parent, "Roof Beam Center", 5.5f, materials);

            for (var x = -19f; x <= 21f; x += 10f)
            {
                CreateBox(
                    parent,
                    $"Ceiling Purlin {x}",
                    new Vector3(x, 6.18f, 4f),
                    new Vector3(0.18f, 0.18f, 30f),
                    materials.galvanizedSteel);
            }

            for (var z = -10f; z <= 16f; z += 4.5f)
            {
                CreateBox(
                    parent,
                    $"Wall Panel Seam {z}",
                    new Vector3(-21.78f, 3.5f, z),
                    new Vector3(0.03f, 6.7f, 0.045f),
                    materials.darkSteel);
                CreateBox(
                    parent,
                    $"Back Wall Panel Seam {z}",
                    new Vector3(1f, 3.5f, 17.58f),
                    new Vector3(0.045f, 6.7f, 0.03f),
                    materials.darkSteel);
            }
        }

        private static void BuildPumpTrain(
            Transform parent,
            string groupName,
            Vector3 localPosition,
            string displayName,
            string deviceCode,
            string shortCode,
            InspectionMaterialPalette materials,
            Material motorMaterial)
        {
            var group = CreateGroup(parent, groupName, localPosition);

            var skid = CreateBox(
                group.transform,
                "Heavy Duty Skid",
                new Vector3(0f, 0.22f, 0f),
                new Vector3(6.8f, 0.35f, 2.15f),
                materials.darkSteel,
                true);
            AddSurface(
                skid,
                displayName,
                deviceCode,
                InspectionSurface.PumpRoomCategory);

            CreateBox(
                group.transform,
                "Skid Front Rail",
                new Vector3(0f, 0.44f, -0.86f),
                new Vector3(6.5f, 0.16f, 0.18f),
                materials.safetyYellow);
            CreateBox(
                group.transform,
                "Skid Rear Rail",
                new Vector3(0f, 0.44f, 0.86f),
                new Vector3(6.5f, 0.16f, 0.18f),
                materials.safetyYellow);

            foreach (var x in new[] { -2.55f, 2.55f })
            {
                CreateBox(
                    group.transform,
                    $"Skid Foot {x}",
                    new Vector3(x, 0.05f, 0f),
                    new Vector3(0.55f, 0.1f, 2.35f),
                    materials.galvanizedSteel);
            }

            var motor = CreateCylinder(
                group.transform,
                "Blue TEFC Motor",
                new Vector3(-1.42f, 1.16f, 0f),
                new Vector3(0.68f, 1.15f, 0.68f),
                Quaternion.Euler(0f, 0f, 90f),
                motorMaterial,
                true);
            AddSurface(
                motor,
                displayName,
                deviceCode,
                InspectionSurface.PumpRoomCategory);

            for (var index = 0; index < 6; index++)
            {
                CreateCylinder(
                    group.transform,
                    $"Motor Cooling Rib {index + 1}",
                    new Vector3(-2.38f + index * 0.38f, 1.16f, 0f),
                    new Vector3(0.72f, 0.035f, 0.72f),
                    Quaternion.Euler(0f, 0f, 90f),
                    materials.galvanizedSteel);
            }

            CreateCylinder(
                group.transform,
                "Motor Fan Cover",
                new Vector3(-2.58f, 1.16f, 0f),
                new Vector3(0.58f, 0.1f, 0.58f),
                Quaternion.Euler(0f, 0f, 90f),
                materials.darkSteel);
            CreateCylinder(
                group.transform,
                "Motor Terminal Box",
                new Vector3(-1.2f, 1.82f, 0f),
                new Vector3(0.34f, 0.18f, 0.26f),
                Quaternion.identity,
                materials.darkSteel);

            CreateBox(
                group.transform,
                "Motor Front Foot",
                new Vector3(-1.42f, 0.64f, -0.58f),
                new Vector3(1.75f, 0.3f, 0.26f),
                materials.darkSteel);
            CreateBox(
                group.transform,
                "Motor Rear Foot",
                new Vector3(-1.42f, 0.64f, 0.58f),
                new Vector3(1.75f, 0.3f, 0.26f),
                materials.darkSteel);

            CreateCylinderBetween(
                group.transform,
                "Drive Shaft",
                new Vector3(-0.28f, 1.13f, 0f),
                new Vector3(0.36f, 1.13f, 0f),
                0.105f,
                materials.stainlessSteel);
            CreateCylinderBetween(
                group.transform,
                "Flexible Coupling",
                new Vector3(-0.12f, 1.13f, 0f),
                new Vector3(0.16f, 1.13f, 0f),
                0.19f,
                materials.darkSteel);

            CreateBox(
                group.transform,
                "Coupling Guard Top",
                new Vector3(0.02f, 1.53f, 0f),
                new Vector3(0.86f, 0.06f, 0.62f),
                materials.safetyYellow);
            CreateBox(
                group.transform,
                "Coupling Guard Bottom",
                new Vector3(0.02f, 0.76f, 0f),
                new Vector3(0.86f, 0.06f, 0.62f),
                materials.safetyYellow);
            for (var index = 0; index < 5; index++)
            {
                var x = -0.38f + index * 0.2f;
                CreateBox(
                    group.transform,
                    $"Coupling Guard Bar {index + 1}",
                    new Vector3(x, 1.15f, -0.31f),
                    new Vector3(0.035f, 0.72f, 0.035f),
                    materials.safetyYellow);
                CreateBox(
                    group.transform,
                    $"Coupling Guard Rear Bar {index + 1}",
                    new Vector3(x, 1.15f, 0.31f),
                    new Vector3(0.035f, 0.72f, 0.035f),
                    materials.safetyYellow);
            }

            var pump = CreateCylinder(
                group.transform,
                "Centrifugal Pump Volute",
                new Vector3(1.42f, 1.12f, 0f),
                new Vector3(0.88f, 0.34f, 0.88f),
                Quaternion.Euler(90f, 0f, 0f),
                motorMaterial,
                true);
            AddSurface(
                pump,
                displayName,
                deviceCode,
                InspectionSurface.PumpRoomCategory);

            CreateCylinder(
                group.transform,
                "Pump Bearing Housing",
                new Vector3(1.42f, 1.12f, -0.47f),
                new Vector3(0.38f, 0.16f, 0.38f),
                Quaternion.Euler(90f, 0f, 0f),
                materials.galvanizedSteel);
            CreateCylinder(
                group.transform,
                "Pump Front Cover",
                new Vector3(1.42f, 1.12f, 0.4f),
                new Vector3(0.72f, 0.075f, 0.72f),
                Quaternion.Euler(90f, 0f, 0f),
                materials.stainlessSteel);

            CreatePipeRun(
                group.transform,
                "Suction Pipe",
                new Vector3(1.42f, 0.55f, -0.35f),
                new Vector3(1.42f, 0.48f, -1.65f),
                0.18f,
                materials.galvanizedSteel);
            CreatePipeRun(
                group.transform,
                "Discharge Riser",
                new Vector3(1.42f, 1.78f, 0f),
                new Vector3(1.42f, 2.67f, 0f),
                0.17f,
                materials.galvanizedSteel);
            CreatePipeElbow(
                group.transform,
                "Discharge Elbow",
                new Vector3(1.42f, 3.15f, 0f),
                0.48f,
                0.17f,
                materials.galvanizedSteel);
            CreatePipeRun(
                group.transform,
                "Discharge Header Run",
                new Vector3(1.42f, 3.15f, 0.48f),
                new Vector3(1.42f, 3.15f, 7.25f),
                0.17f,
                materials.galvanizedSteel);

            CreateFlange(
                group.transform,
                "Suction Flange",
                new Vector3(1.42f, 0.48f, -1.66f),
                false,
                materials.stainlessSteel);
            CreateFlange(
                group.transform,
                "Discharge Flange",
                new Vector3(1.42f, 3.15f, 2.1f),
                false,
                materials.stainlessSteel);
            CreateValve(group.transform, new Vector3(1.42f, 2.38f, 0f), materials);
            CreatePressureGauge(
                group.transform,
                "Pump",
                new Vector3(1.92f, 2.52f, -0.18f),
                materials);

            CreateBox(
                group.transform,
                "Equipment Nameplate",
                new Vector3(-1.25f, 1.78f, -1.11f),
                new Vector3(1.75f, 0.42f, 0.035f),
                materials.darkSteel);
            CreateText(
                group.transform,
                "Equipment Code",
                shortCode,
                new Vector3(-1.25f, 1.78f, -1.14f),
                Vector3.zero,
                0.075f,
                Color.white);
        }

        private static void BuildPipeHeader(
            Transform parent,
            InspectionMaterialPalette materials)
        {
            var header = CreatePipeRun(
                parent,
                "Main Process Header",
                new Vector3(-16f, 4.35f, 10.75f),
                new Vector3(18f, 4.35f, 10.75f),
                0.24f,
                materials.galvanizedSteel,
                true);
            AddSurface(
                header,
                "泵房工艺主管道",
                "PIPE-HEADER-01",
                InspectionSurface.PipeAreaCategory);

            CreatePipeRun(
                parent,
                "Secondary Service Header",
                new Vector3(-16f, 3.72f, 12.2f),
                new Vector3(18f, 3.72f, 12.2f),
                0.14f,
                materials.stainlessSteel);

            foreach (var x in new[] { -15f, -7f, 1f, 9f, 17f })
            {
                CreateBox(
                    parent,
                    $"Pipe Support Post {x}",
                    new Vector3(x, 2.05f, 10.75f),
                    new Vector3(0.16f, 4.1f, 0.16f),
                    materials.darkSteel);
                CreateBox(
                    parent,
                    $"Pipe Support Foot {x}",
                    new Vector3(x, 0.05f, 10.75f),
                    new Vector3(0.72f, 0.1f, 0.72f),
                    materials.galvanizedSteel);
                CreateBox(
                    parent,
                    $"Pipe Saddle {x}",
                    new Vector3(x, 4.1f, 10.75f),
                    new Vector3(0.62f, 0.14f, 0.52f),
                    materials.galvanizedSteel);
            }

            foreach (var x in new[] { -12f, -4f, 4f, 12f })
            {
                CreateFlange(
                    parent,
                    $"Header Flange {x}",
                    new Vector3(x, 4.35f, 10.75f),
                    false,
                    materials.stainlessSteel);
            }

            CreateValve(parent, new Vector3(18f, 4.35f, 10.75f), materials);
            CreatePressureGauge(
                parent,
                "Header",
                new Vector3(17.35f, 4.55f, 10.35f),
                materials);
        }

        private static void BuildCabinetBank(
            Transform parent,
            InspectionMaterialPalette materials)
        {
            var bank = CreateGroup(parent, "MCC Control Cabinet Bank", new Vector3(15.2f, 0f, 5.2f));
            var cabinet = CreateBox(
                bank.transform,
                "MCC Cabinet Enclosure",
                new Vector3(0f, 1.95f, 0f),
                new Vector3(5.1f, 3.9f, 1.15f),
                materials.cabinetMetal,
                true);
            AddSurface(
                cabinet,
                "MCC 配电控制柜",
                "MCC-E01",
                InspectionSurface.ElectricalRoomCategory);

            CreateBox(
                bank.transform,
                "Cabinet Base",
                new Vector3(0f, 0.1f, 0f),
                new Vector3(5.35f, 0.2f, 1.38f),
                materials.darkSteel);
            CreateBox(
                bank.transform,
                "Cabinet Top Cap",
                new Vector3(0f, 3.96f, 0f),
                new Vector3(5.3f, 0.16f, 1.34f),
                materials.galvanizedSteel);

            foreach (var x in new[] { -2.5f, 0f, 2.5f })
            {
                CreateBox(
                    bank.transform,
                    $"Cabinet Door Seam {x}",
                    new Vector3(x, 1.98f, -0.59f),
                    new Vector3(0.035f, 3.62f, 0.025f),
                    materials.safetyBlack);
            }

            foreach (var x in new[] { -1.25f, 1.25f })
            {
                CreateBox(
                    bank.transform,
                    $"Door Handle {x}",
                    new Vector3(x, 1.45f, -0.68f),
                    new Vector3(0.09f, 0.62f, 0.08f),
                    materials.stainlessSteel);
            }

            for (var index = 0; index < 8; index++)
            {
                CreateBox(
                    bank.transform,
                    $"Vent Slat {index + 1}",
                    new Vector3(-1.25f, 0.62f + index * 0.12f, -0.615f),
                    new Vector3(1.7f, 0.035f, 0.025f),
                    materials.safetyBlack);
            }

            CreateIndicator(
                bank.transform,
                "Power Indicator",
                new Vector3(-0.42f, 3.18f, -0.62f),
                materials.indicatorGreen,
                materials.darkSteel);
            CreateIndicator(
                bank.transform,
                "Alarm Indicator",
                new Vector3(0f, 3.18f, -0.62f),
                materials.indicatorRed,
                materials.darkSteel);
            CreateIndicator(
                bank.transform,
                "Run Indicator",
                new Vector3(0.42f, 3.18f, -0.62f),
                materials.indicatorAmber,
                materials.darkSteel);

            CreateBox(
                bank.transform,
                "Cabinet Warning Plate",
                new Vector3(1.35f, 2.65f, -0.625f),
                new Vector3(0.78f, 0.42f, 0.025f),
                materials.safetyYellow);
            CreateBox(
                bank.transform,
                "Warning Plate Bar One",
                new Vector3(1.35f, 2.7f, -0.646f),
                new Vector3(0.48f, 0.055f, 0.012f),
                materials.safetyBlack);
            CreateBox(
                bank.transform,
                "Warning Plate Bar Two",
                new Vector3(1.35f, 2.58f, -0.646f),
                new Vector3(0.34f, 0.055f, 0.012f),
                materials.safetyBlack);

            CreateText(
                bank.transform,
                "Cabinet Label",
                "MCC-E01",
                new Vector3(-1.22f, 3.55f, -0.67f),
                Vector3.zero,
                0.065f,
                Color.white);

            CreatePressureGauge(
                bank.transform,
                "Cabinet",
                new Vector3(-1.25f, 2.6f, -0.68f),
                materials);

            CreateBox(
                bank.transform,
                "Cable Tray",
                new Vector3(1.15f, 4.2f, 1.25f),
                new Vector3(4.8f, 0.14f, 0.65f),
                materials.galvanizedSteel);
        }

        private static void BuildDrainageAndSafety(
            Transform parent,
            InspectionMaterialPalette materials)
        {
            CreateBox(
                parent,
                "Drainage Trench",
                new Vector3(1f, 0.015f, -8.6f),
                new Vector3(40f, 0.04f, 0.74f),
                materials.safetyBlack);
            CreateBox(
                parent,
                "Drain Trench Front Curb",
                new Vector3(1f, 0.09f, -9.05f),
                new Vector3(40f, 0.18f, 0.16f),
                materials.concreteWall);
            CreateBox(
                parent,
                "Drain Trench Rear Curb",
                new Vector3(1f, 0.09f, -8.15f),
                new Vector3(40f, 0.18f, 0.16f),
                materials.concreteWall);

            for (var index = 0; index < 28; index++)
            {
                var x = -18f + index * 1.4f;
                CreateBox(
                    parent,
                    $"Drain Grate Bar {index + 1}",
                    new Vector3(x, 0.085f, -8.6f),
                    new Vector3(0.075f, 0.035f, 0.8f),
                    materials.galvanizedSteel);
            }

            CreateBox(
                parent,
                "Safety Zone Front Line",
                new Vector3(0f, 0.018f, -0.2f),
                new Vector3(28f, 0.025f, 0.14f),
                materials.safetyYellow);
            CreateBox(
                parent,
                "Safety Zone Rear Line",
                new Vector3(0f, 0.018f, 11.5f),
                new Vector3(28f, 0.025f, 0.14f),
                materials.safetyYellow);
            CreateBox(
                parent,
                "Safety Zone Left Line",
                new Vector3(-14f, 0.018f, 5.65f),
                new Vector3(0.14f, 0.025f, 11.7f),
                materials.safetyYellow);
            CreateBox(
                parent,
                "Safety Zone Right Line",
                new Vector3(14f, 0.018f, 5.65f),
                new Vector3(0.14f, 0.025f, 11.7f),
                materials.safetyYellow);

            for (var index = 0; index < 17; index++)
            {
                var x = -12.8f + index * 1.6f;
                CreateBox(
                    parent,
                    $"Hazard Stripe {index + 1}",
                    new Vector3(x, 0.032f, -0.2f),
                    new Vector3(0.54f, 0.018f, 0.16f),
                    materials.safetyBlack,
                    false,
                    Quaternion.Euler(0f, 32f, 0f));
            }

            CreateMetalGrating(
                parent,
                "Local Floor Grating",
                new Vector3(13.3f, 0.1f, -5.6f),
                new Vector3(4.8f, 2.4f),
                materials);
        }

        private static void CreateMetalGrating(
            Transform parent,
            string name,
            Vector3 localPosition,
            Vector3 size,
            InspectionMaterialPalette materials)
        {
            var group = CreateGroup(parent, name, localPosition);
            for (var x = -size.x * 0.5f; x <= size.x * 0.5f; x += 0.42f)
            {
                CreateBox(
                    group.transform,
                    $"Grating Slat X {x:F1}",
                    new Vector3(x, 0f, 0f),
                    new Vector3(0.12f, 0.045f, size.y),
                    materials.galvanizedSteel);
            }
            CreateBox(
                group.transform,
                "Grating Cross Brace Front",
                new Vector3(0f, 0.02f, -size.y * 0.5f),
                new Vector3(size.x, 0.06f, 0.11f),
                materials.darkSteel);
            CreateBox(
                group.transform,
                "Grating Cross Brace Rear",
                new Vector3(0f, 0.02f, size.y * 0.5f),
                new Vector3(size.x, 0.06f, 0.11f),
                materials.darkSteel);
        }

        private static void BuildIndustrialLighting(
            Transform parent,
            InspectionMaterialPalette materials)
        {
            var lighting = CreateGroup(parent, "Industrial Lighting");
            var positions = new[]
            {
                new Vector3(-8f, 5.75f, 2.5f),
                new Vector3(2f, 5.75f, 2.5f),
                new Vector3(12f, 5.75f, 4.5f),
                new Vector3(10f, 5.75f, 11.5f)
            };

            foreach (var position in positions)
            {
                var housing = CreateCylinder(
                    lighting.transform,
                    "Industrial Light Housing",
                    position,
                    new Vector3(0.46f, 0.09f, 0.46f),
                    Quaternion.identity,
                    materials.darkSteel);
                CreateCylinder(
                    lighting.transform,
                    "Warm Diffuser",
                    position + Vector3.down * 0.1f,
                    new Vector3(0.34f, 0.018f, 0.34f),
                    Quaternion.identity,
                    materials.warmLight);
                housing.AddComponent<Light>().type = LightType.Point;
                var lamp = housing.GetComponent<Light>();
                lamp.color = new Color(1f, 0.82f, 0.6f);
                lamp.intensity = 380f;
                lamp.range = 13f;
                lamp.shadows = LightShadows.None;
                lamp.bounceIntensity = 0.35f;
            }
        }

        private static void CreateIBeam(
            Transform parent,
            string name,
            float z,
            InspectionMaterialPalette materials)
        {
            var group = CreateGroup(parent, name);
            CreateBox(
                group.transform,
                "Top Flange",
                new Vector3(1f, 6.18f, z),
                new Vector3(45f, 0.18f, 0.32f),
                materials.darkSteel);
            CreateBox(
                group.transform,
                "Web",
                new Vector3(1f, 5.92f, z),
                new Vector3(45f, 0.48f, 0.1f),
                materials.darkSteel);
            CreateBox(
                group.transform,
                "Bottom Flange",
                new Vector3(1f, 5.66f, z),
                new Vector3(45f, 0.18f, 0.32f),
                materials.darkSteel);
        }

        private static void CreateValve(
            Transform parent,
            Vector3 position,
            InspectionMaterialPalette materials)
        {
            CreateBox(
                parent,
                "Valve Body",
                position,
                new Vector3(0.42f, 0.46f, 0.4f),
                materials.galvanizedSteel);
            CreateCylinder(
                parent,
                "Valve Stem",
                position + Vector3.up * 0.31f,
                new Vector3(0.055f, 0.24f, 0.055f),
                Quaternion.identity,
                materials.stainlessSteel);
            CreateCylinder(
                parent,
                "Valve Handwheel",
                position + Vector3.up * 0.58f,
                new Vector3(0.38f, 0.035f, 0.38f),
                Quaternion.identity,
                materials.safetyYellow);
            for (var index = 0; index < 4; index++)
            {
                var rotation = Quaternion.Euler(0f, index * 45f, 0f);
                CreateBox(
                    parent,
                    "Valve Wheel Spoke",
                    position + Vector3.up * 0.61f + rotation * Vector3.forward * 0.16f,
                    new Vector3(0.045f, 0.03f, 0.34f),
                    materials.safetyYellow,
                    false,
                    rotation);
            }
        }

        private static void CreatePressureGauge(
            Transform parent,
            string prefix,
            Vector3 position,
            InspectionMaterialPalette materials)
        {
            CreateCylinder(
                parent,
                prefix + " Gauge Rim",
                position,
                new Vector3(0.28f, 0.055f, 0.28f),
                Quaternion.Euler(90f, 0f, 0f),
                materials.stainlessSteel);
            CreateCylinder(
                parent,
                prefix + " Gauge Face",
                position + Vector3.back * 0.058f,
                new Vector3(0.24f, 0.018f, 0.24f),
                Quaternion.Euler(90f, 0f, 0f),
                materials.gaugeFace);
            CreateBox(
                parent,
                prefix + " Gauge Needle",
                position + Vector3.back * 0.08f + Vector3.up * 0.07f,
                new Vector3(0.018f, 0.2f, 0.012f),
                materials.indicatorRed,
                false,
                Quaternion.Euler(0f, 0f, -28f));
        }

        private static void CreateIndicator(
            Transform parent,
            string name,
            Vector3 position,
            Material material,
            Material bezelMaterial)
        {
            CreateCylinder(
                parent,
                name,
                position,
                new Vector3(0.07f, 0.025f, 0.07f),
                Quaternion.Euler(90f, 0f, 0f),
                material);
            CreateCylinder(
                parent,
                name + " Bezel",
                position + Vector3.back * 0.015f,
                new Vector3(0.1f, 0.018f, 0.1f),
                Quaternion.Euler(90f, 0f, 0f),
                bezelMaterial);
        }

        private static void CreateFlange(
            Transform parent,
            string name,
            Vector3 position,
            bool vertical,
            Material material)
        {
            CreateCylinder(
                parent,
                name,
                position,
                new Vector3(0.3f, 0.055f, 0.3f),
                vertical ? Quaternion.identity : Quaternion.Euler(90f, 0f, 0f),
                material);
        }

        private static GameObject CreatePipeRun(
            Transform parent,
            string name,
            Vector3 start,
            Vector3 end,
            float radius,
            Material material,
            bool collider = false)
        {
            return CreateCylinderBetween(
                parent,
                name,
                start,
                end,
                radius,
                material,
                collider);
        }

        private static void CreatePipeElbow(
            Transform parent,
            string name,
            Vector3 corner,
            float bendRadius,
            float pipeRadius,
            Material material)
        {
            const int segmentCount = 6;
            var center = corner + new Vector3(0f, -bendRadius, bendRadius);
            var previous = center + Vector3.back * bendRadius;
            for (var index = 1; index <= segmentCount; index++)
            {
                var angle = Mathf.PI * 0.5f * index / segmentCount;
                var current = center + new Vector3(
                    0f,
                    Mathf.Sin(angle) * bendRadius,
                    -Mathf.Cos(angle) * bendRadius);
                CreateCylinderBetween(
                    parent,
                    name + " Segment " + index,
                    previous,
                    current,
                    pipeRadius,
                    material);
                previous = current;
            }
        }

        private static GameObject CreateCylinderBetween(
            Transform parent,
            string name,
            Vector3 start,
            Vector3 end,
            float radius,
            Material material,
            bool collider = false)
        {
            var direction = end - start;
            var cylinder = CreatePrimitive(
                PrimitiveType.Cylinder,
                parent,
                name,
                (start + end) * 0.5f,
                new Vector3(radius, direction.magnitude * 0.5f, radius),
                Quaternion.FromToRotation(Vector3.up, direction.normalized),
                material,
                collider);
            return cylinder;
        }

        private static GameObject CreateBox(
            Transform parent,
            string name,
            Vector3 localPosition,
            Vector3 localScale,
            Material material,
            bool collider = false,
            Quaternion? localRotation = null)
        {
            return CreatePrimitive(
                PrimitiveType.Cube,
                parent,
                name,
                localPosition,
                localScale,
                localRotation ?? Quaternion.identity,
                material,
                collider);
        }

        private static GameObject CreateCylinder(
            Transform parent,
            string name,
            Vector3 localPosition,
            Vector3 localScale,
            Quaternion localRotation,
            Material material,
            bool collider = false)
        {
            return CreatePrimitive(
                PrimitiveType.Cylinder,
                parent,
                name,
                localPosition,
                localScale,
                localRotation,
                material,
                collider);
        }

        private static GameObject CreateSphere(
            Transform parent,
            string name,
            Vector3 localPosition,
            Vector3 localScale,
            Material material)
        {
            return CreatePrimitive(
                PrimitiveType.Sphere,
                parent,
                name,
                localPosition,
                localScale,
                Quaternion.identity,
                material,
                false);
        }

        private static GameObject CreatePrimitive(
            PrimitiveType primitive,
            Transform parent,
            string name,
            Vector3 localPosition,
            Vector3 localScale,
            Quaternion localRotation,
            Material material,
            bool collider)
        {
            var gameObject = GameObject.CreatePrimitive(primitive);
            gameObject.name = name;
            gameObject.transform.SetParent(parent, false);
            gameObject.transform.localPosition = localPosition;
            gameObject.transform.localRotation = localRotation;
            gameObject.transform.localScale = localScale;
            gameObject.GetComponent<Renderer>().sharedMaterial = material;
            if (!collider)
            {
                DestroyCollider(gameObject);
            }
            return gameObject;
        }

        private static GameObject CreateGroup(
            Transform parent,
            string name,
            Vector3? localPosition = null)
        {
            var group = new GameObject(name);
            group.transform.SetParent(parent, false);
            group.transform.localPosition = localPosition ?? Vector3.zero;
            return group;
        }

        private static void AddSurface(
            GameObject target,
            string displayName,
            string deviceCode,
            string sceneCategory)
        {
            var surface = target.GetComponent<InspectionSurface>();
            if (surface == null)
            {
                surface = target.AddComponent<InspectionSurface>();
            }
            surface.Initialize(displayName, deviceCode, sceneCategory);
        }

        private static void CreateText(
            Transform parent,
            string name,
            string text,
            Vector3 localPosition,
            Vector3 localEulerAngles,
            float characterSize,
            Color color)
        {
            var textObject = new GameObject(name);
            textObject.transform.SetParent(parent, false);
            textObject.transform.localPosition = localPosition;
            textObject.transform.localRotation = Quaternion.Euler(localEulerAngles);
            var textMesh = textObject.AddComponent<TextMesh>();
            textMesh.text = text;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
            textMesh.fontSize = 64;
            textMesh.characterSize = characterSize;
            textMesh.color = color;
        }

        private static void DestroyCollider(GameObject target)
        {
            var collider = target.GetComponent<Collider>();
            if (collider == null)
            {
                return;
            }

            if (Application.isPlaying)
            {
                Object.Destroy(collider);
            }
            else
            {
                Object.DestroyImmediate(collider);
            }
        }
    }
}
